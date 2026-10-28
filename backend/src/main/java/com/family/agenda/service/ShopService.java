package com.family.agenda.service;

import com.family.agenda.dto.ArticleDTO;
import com.family.agenda.dto.CoinTransactionDTO;
import com.family.agenda.dto.MemberItemDTO;
import com.family.agenda.dto.PorteMonnaieDTO;
import com.family.agenda.entity.CoinTransaction;
import com.family.agenda.entity.CoinTransactionType;
import com.family.agenda.entity.FamilyMember;
import com.family.agenda.entity.FamilySettings;
import com.family.agenda.entity.MemberItem;
import com.family.agenda.entity.MemberItemId;
import com.family.agenda.entity.MemberOutfit;
import com.family.agenda.entity.MemberWallet;
import com.family.agenda.exception.BusinessRuleException;
import com.family.agenda.exception.ConflictException;
import com.family.agenda.exception.ResourceNotFoundException;
import com.family.agenda.mapper.AvatarConfigConverter;
import com.family.agenda.repository.CoinTransactionRepository;
import com.family.agenda.repository.FamilyMemberRepository;
import com.family.agenda.repository.FamilySettingsRepository;
import com.family.agenda.repository.MemberItemRepository;
import com.family.agenda.repository.MemberOutfitRepository;
import com.family.agenda.repository.MemberWalletRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Boutique : étoiles → pièces d'or → articles. Échanges, achats et remboursements d'un même membre passent par le
 * verrou en écriture de son porte-monnaie : un double clic ou deux appareils ne dépensent jamais deux fois.
 * Les articles gratuits (prix 0 au catalogue) sont possédés d'office, sans ligne en base.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class ShopService {

    /** Pièce remise à la place d'un article remboursé, par emplacement ({@code none} pour les emplacements facultatifs). */
    private static final Map<String, String> PAR_DEFAUT = Map.of(
            "hair", "hair-short", "outfit", "outfit-tshirt", "background", "#fde68a", "eyes", "eyes-round", "mouth", "mouth-smile");

    private final CatalogueService catalogue;
    private final StarPenaltyService stars;
    private final MemberWalletRepository walletRepository;
    private final CoinTransactionRepository transactionRepository;
    private final MemberItemRepository itemRepository;
    private final MemberOutfitRepository outfitRepository;
    private final FamilyMemberRepository memberRepository;
    private final FamilySettingsRepository settingsRepository;
    private final AvatarConfigConverter avatarConverter;
    private final Clock clock;

    // ---------- lecture

    @Transactional(readOnly = true)
    public List<ArticleDTO> catalogue() {
        return catalogue.all();
    }

    @Transactional(readOnly = true)
    public PorteMonnaieDTO porteMonnaie(Long memberId) {
        loadMember(memberId);
        MemberWallet wallet = walletRepository.findById(memberId).orElse(new MemberWallet(memberId));
        return toDto(wallet, stars.balance(memberId).solde());
    }

    @Transactional(readOnly = true)
    public List<MemberItemDTO> articles(Long memberId) {
        loadMember(memberId);
        return itemRepository.findByMemberIdOrderByAcquisLeAsc(memberId).stream()
                .map(i -> new MemberItemDTO(i.getArticleId(), i.getAcquisLe(), i.getPrixPaye())).toList();
    }

    @Transactional(readOnly = true)
    public List<CoinTransactionDTO> transactions(Long memberId) {
        loadMember(memberId);
        return transactionRepository.findByMemberIdOrderByIdDesc(memberId).stream()
                .map(t -> new CoinTransactionDTO(t.getId(), t.getType(), t.getPieces(), t.getEtoiles(), t.getArticleId(), t.getCommentaire(), t.getCreeLe()))
                .toList();
    }

    // ---------- enfant (ou parent) : échange et achat

    /** Échange {@code pieces × étoiles par pièce} étoiles contre des pièces. */
    public PorteMonnaieDTO exchange(Long memberId, int pieces, Long accountId) {
        MemberWallet wallet = lockedWallet(memberId);
        int taux = etoilesParPiece();
        long cout = (long) pieces * taux;
        long disponibles = stars.balance(memberId).solde();
        if (cout > disponibles) {
            throw new BusinessRuleException("Pas assez d'étoiles : %d demandées pour %d pièce(s), %d disponibles".formatted(cout, pieces, disponibles));
        }
        wallet.setPieces(wallet.getPieces() + pieces);
        wallet.setEtoilesConverties(wallet.getEtoilesConverties() + (int) cout);
        journal(memberId, CoinTransactionType.ECHANGE, pieces, (int) cout, null, null, accountId);
        return toDto(wallet, stars.balance(memberId).solde());
    }

    public PorteMonnaieDTO buy(Long memberId, String articleId, Long accountId) {
        MemberWallet wallet = lockedWallet(memberId);
        ArticleDTO article = payant(articleId);
        if (itemRepository.existsByMemberIdAndArticleId(memberId, articleId)) {
            throw new ConflictException("Article déjà possédé : " + articleId);
        }
        if (wallet.getPieces() < article.prix()) {
            throw new BusinessRuleException("Pas assez de pièces : %d nécessaires, %d disponibles".formatted(article.prix(), wallet.getPieces()));
        }
        wallet.setPieces(wallet.getPieces() - article.prix());
        addItem(memberId, articleId, article.prix());
        journal(memberId, CoinTransactionType.ACHAT, -article.prix(), null, articleId, null, accountId);
        return toDto(wallet, stars.balance(memberId).solde());
    }

    // ---------- parent : cadeau, remboursement, ajustement

    public PorteMonnaieDTO gift(Long memberId, String articleId, Long accountId) {
        MemberWallet wallet = lockedWallet(memberId);
        payant(articleId);
        if (itemRepository.existsByMemberIdAndArticleId(memberId, articleId)) {
            throw new ConflictException("Article déjà possédé : " + articleId);
        }
        addItem(memberId, articleId, 0);
        journal(memberId, CoinTransactionType.CADEAU, 0, null, articleId, null, accountId);
        return toDto(wallet, stars.balance(memberId).solde());
    }

    /** Annule un achat : l'article est retiré, les pièces payées sont rendues, et il n'est plus porté. */
    public PorteMonnaieDTO refund(Long memberId, String articleId, String commentaire, Long accountId) {
        MemberWallet wallet = lockedWallet(memberId);
        MemberItem item = itemRepository.findById(new MemberItemId(memberId, articleId))
                .orElseThrow(() -> new ResourceNotFoundException("Article possédé", articleId));
        wallet.setPieces(wallet.getPieces() + item.getPrixPaye());
        itemRepository.delete(item);
        journal(memberId, CoinTransactionType.REMBOURSEMENT, item.getPrixPaye(), null, articleId, blankToNull(commentaire), accountId);
        retirerDesPersonnages(memberId, articleId);
        return toDto(wallet, stars.balance(memberId).solde());
    }

    public PorteMonnaieDTO adjust(Long memberId, int pieces, String commentaire, Long accountId) {
        MemberWallet wallet = lockedWallet(memberId);
        if (pieces == 0) {
            throw new BusinessRuleException("Un ajustement de 0 pièce n'a pas de sens");
        }
        if (wallet.getPieces() + pieces < 0) {
            throw new BusinessRuleException("Le membre n'a que %d pièce(s) : on ne peut pas en retirer %d".formatted(wallet.getPieces(), -pieces));
        }
        wallet.setPieces(wallet.getPieces() + pieces);
        journal(memberId, CoinTransactionType.AJUSTEMENT, pieces, null, null, commentaire.strip(), accountId);
        return toDto(wallet, stars.balance(memberId).solde());
    }

    // ---------- réglage

    @Transactional(readOnly = true)
    public int etoilesParPiece() {
        return settingsRepository.findById(FamilySettings.ID).map(FamilySettings::getEtoilesParPiece).orElse(10);
    }

    public int updateEtoilesParPiece(int etoilesParPiece, Long accountId) {
        FamilySettings settings = settingsRepository.findById(FamilySettings.ID).orElseGet(() -> settingsRepository.save(new FamilySettings()));
        settings.setEtoilesParPiece(etoilesParPiece);
        settings.setModifiePar(accountId);
        settings.setModifieLe(LocalDateTime.now(clock));
        return etoilesParPiece;
    }

    // ---------- personnage

    /**
     * Refuse (400, avec l'article fautif) une config qui contient un article payant que le membre ne possède pas.
     * Les ids inconnus du catalogue sont tolérés (le front les remplace par la pièce par défaut), comme les couleurs.
     */
    @Transactional(readOnly = true)
    public void assertOwned(Long memberId, Map<String, Object> config) {
        if (config == null) {
            return;
        }
        Set<String> possedes = null;
        for (Object valeur : config.values()) {
            if (valeur instanceof String id) {
                ArticleDTO article = catalogue.find(id).orElse(null);
                if (article != null && article.prix() > 0) {
                    if (possedes == null) {
                        possedes = new HashSet<>();
                        for (MemberItem item : itemRepository.findByMemberIdOrderByAcquisLeAsc(memberId)) {
                            possedes.add(item.getArticleId());
                        }
                    }
                    if (!possedes.contains(id)) {
                        throw new BusinessRuleException("Article non possédé : " + id);
                    }
                }
            }
        }
    }

    // ---------- interne

    /** Porte-monnaie verrouillé (créé s'il manque : membre créé avant la boutique). */
    private MemberWallet lockedWallet(Long memberId) {
        loadMember(memberId);
        return walletRepository.findForUpdate(memberId).orElseGet(() -> walletRepository.saveAndFlush(new MemberWallet(memberId)));
    }

    private ArticleDTO payant(String articleId) {
        ArticleDTO article = catalogue.find(articleId).orElseThrow(() -> new ResourceNotFoundException("Article", articleId));
        if (article.prix() == 0) {
            throw new BusinessRuleException("Cet article est gratuit : " + articleId);
        }
        return article;
    }

    private void addItem(Long memberId, String articleId, int prix) {
        MemberItem item = new MemberItem();
        item.setMemberId(memberId);
        item.setArticleId(articleId);
        item.setPrixPaye(prix);
        item.setAcquisLe(now());
        itemRepository.save(item);
    }

    private void journal(Long memberId, CoinTransactionType type, int pieces, Integer etoiles, String articleId, String commentaire, Long accountId) {
        CoinTransaction t = new CoinTransaction();
        t.setMemberId(memberId);
        t.setType(type);
        t.setPieces(pieces);
        t.setEtoiles(etoiles);
        t.setArticleId(articleId);
        t.setCommentaire(commentaire);
        t.setCreePar(accountId);
        t.setCreeLe(now());
        transactionRepository.save(t);
    }

    /** L'article remboursé est remplacé, dans le personnage et dans les tenues de thème, par la pièce par défaut. */
    private void retirerDesPersonnages(Long memberId, String articleId) {
        FamilyMember member = loadMember(memberId);
        String emplacement = catalogue.find(articleId).map(ArticleDTO::emplacement).orElse("");
        String remplacement = PAR_DEFAUT.getOrDefault(emplacement, "none");
        Map<String, Object> avatar = avatarConverter.toMap(member.getAvatarConfig());
        if (remplacer(avatar, articleId, remplacement)) {
            member.setAvatarConfig(avatarConverter.toJson(avatar));
        }
        for (MemberOutfit outfit : outfitRepository.findByMemberId(memberId)) {
            Map<String, Object> config = avatarConverter.toMap(outfit.getConfig());
            if (remplacer(config, articleId, remplacement)) {
                outfit.setConfig(avatarConverter.toJson(config));
            }
        }
    }

    private static boolean remplacer(Map<String, Object> config, String articleId, String remplacement) {
        if (config == null) {
            return false;
        }
        boolean change = false;
        for (Map.Entry<String, Object> e : new HashMap<>(config).entrySet()) {
            if (articleId.equals(e.getValue())) {
                config.put(e.getKey(), remplacement);
                change = true;
            }
        }
        return change;
    }

    private PorteMonnaieDTO toDto(MemberWallet wallet, long etoilesDisponibles) {
        return new PorteMonnaieDTO(etoilesDisponibles, wallet.getPieces(), etoilesParPiece(), wallet.getEtoilesConverties());
    }

    private FamilyMember loadMember(Long id) {
        return memberRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Membre", id));
    }

    private LocalDateTime now() {
        return LocalDateTime.now(clock).truncatedTo(ChronoUnit.SECONDS);
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.strip();
    }
}
