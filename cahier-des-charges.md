# Cahier des charges — Cheque Reminder

**Version :** 1.0  
**Date d’analyse :** 25 septembre 2026  
**Source :** analyse du code source du projet existant.

## 1. Présentation

Cheque Reminder est une application mobile de gestion personnelle des chèques et de leurs échéances. L’utilisateur saisit les informations d’un chèque, suit son statut, consulte les échéances et reçoit un rappel local avant la date d’échéance. Les données sont conservées sur l’appareil. L’application fournit des exports et des fonctions de sauvegarde/restauration.

Le projet utilise Expo, React Native et TypeScript. L’interface est en français et les montants sont formatés en dirham marocain (MAD). Android est la plateforme explicitement ciblée par les paramètres et scripts de build. Expo configure aussi iOS et Web, mais leur prise en charge complète n’est pas établie par cette analyse.

## 2. Objectifs

- Centraliser les chèques suivis par l’utilisateur.
- Identifier rapidement les chèques actifs, proches de l’échéance ou expirés.
- Réduire les oublis grâce aux notifications locales.
- Rechercher, filtrer et trier les chèques.
- Consulter une photo facultative du chèque.
- Protéger l’accès par PIN et, si disponible, par biométrie facultative.
- Exporter et sauvegarder les données localement.

## 3. Utilisateurs et périmètre

### Utilisateur cible

Un utilisateur individuel qui veut conserver les informations de ses chèques émis, suivre leurs échéances et disposer d’une copie exportable de ses données.

### Fonctions incluses dans l’application observée

- Créer, consulter, modifier et supprimer des chèques.
- Tableau de bord, recherche, filtres de statut et tri.
- Notification locale à 48 heures de l’échéance, si les permissions le permettent.
- Prise de photo ou sélection d’une image depuis la galerie.
- Exports PDF et CSV, sauvegarde et restauration JSON.
- Thèmes clair, sombre ou système.
- PIN numérique à 4 ou 6 chiffres, changement du PIN et déverrouillage biométrique facultatif.

### Hors périmètre constaté

- Comptes distants, serveur ou synchronisation cloud/multi-appareils.
- Gestion multi-utilisateur ou rôles.
- Connexion à une banque, encaissement ou vérification bancaire.
- SMS, courriel ou notification distante.
- Reconnaissance OCR depuis une photo.
- Devises autres que MAD dans le formatage actuel.

## 4. Données d’un chèque

| Champ | Règle constatée | Obligatoire |
|---|---|---|
| Identifiant | Entier auto-incrémenté local | Système |
| Bénéficiaire | Texte de plus d’un caractère après suppression des espaces périphériques | Oui |
| Montant | Valeur numérique positive, affichage MAD avec 2 décimales | Oui |
| Numéro du chèque | Texte non vide | Oui |
| Banque | Texte | Non |
| Date d’émission | Date | Oui |
| Date d’échéance | Date | Oui |
| Statut | En cours, Encaissé, Annulé ou Expiré | Oui |
| Note | Texte libre | Non |
| Image | Fichier local | Non |
| Référence notification | Identifiant interne | Système |
| Création / mise à jour | Horodatages | Système |

Les deux dates sont initialisées au jour de la saisie. Le formulaire ne valide pas explicitement l’ordre chronologique entre émission et échéance.

## 5. Règles de gestion

1. Un chèque « En cours » dont l’échéance est passée est enregistré ou synchronisé comme « Expiré ».
2. La synchronisation de l’expiration intervient lors des consultations de chèques ou de statistiques concernées; elle actualise la date de mise à jour et efface la référence de notification.
3. Les statuts Encaissé, Annulé et Expiré ne déclenchent pas de rappel lors de la création ou modification.
4. Pour un chèque actif avec échéance future à plus de 48 heures, un rappel est planifié exactement 48 heures avant. Si l’heure du rappel est passée, aucun rappel n’est programmé.
5. La modification d’un chèque actif annule le rappel précédent et en planifie un nouveau. Un statut non actif annule le rappel.
6. Le message de rappel mentionne le montant, le bénéficiaire et l’échéance dans 48 heures. Sur Android, le canal est de priorité élevée avec vibration.
7. Les statistiques comprennent le total de chèques, les actifs, ceux arrivant à échéance sous 48 heures, les expirés et la somme de tous les montants, quel que soit le statut.
8. Le tableau de bord présente jusqu’à trois chèques actifs classés par échéance croissante. Cette liste peut inclure des échéances au-delà de 48 heures; le compteur sous 48 heures est séparé.
9. La recherche porte sur le bénéficiaire et le numéro. Les filtres sont Tous, En cours, Encaissé, Annulé et Expiré. Les tris disponibles sont échéance, émission ou montant, ascendant ou descendant.
10. La suppression demande confirmation, annule la notification et supprime l’image gérée par l’application.
11. La restauration JSON remplace les chèques locaux; elle ne réalise pas de fusion.
12. Le PIN est numérique, de 4 ou 6 chiffres, confirmé lors de la création et conservé comme empreinte SHA-256 salée dans SecureStore. L’activation biométrique nécessite une biométrie disponible et validée.
13. Le thème et la préférence biométrique sont persistés localement.

## 6. Exigences fonctionnelles et parcours

### 6.1 Premier démarrage et accès

- Initialiser la base SQLite et le service de notifications.
- Si aucun PIN n’est défini, laisser choisir 4 ou 6 chiffres, le saisir et le confirmer.
- Si un PIN existe et que l’utilisateur n’est pas authentifié, afficher l’écran de déverrouillage.
- Proposer la biométrie si elle est activée et prise en charge, en gardant le PIN comme méthode disponible.
- En cas de PIN invalide, vider la saisie et permettre une nouvelle tentative. Aucune limite de tentatives ni temporisation n’est implémentée actuellement.

### 6.2 Tableau de bord

- Afficher les indicateurs total, actifs, échéance sous 48 heures, expirés et montant total.
- Afficher au plus trois chèques actifs triés par échéance.
- Permettre d’accéder à la liste complète et à la création.
- Présenter un état vide avec une action pour créer un chèque.

### 6.3 Gestion des chèques

- Saisir bénéficiaire, montant, numéro, banque, dates, statut, note et image.
- Utiliser le sélecteur de date natif.
- Prendre une photo ou choisir une image après permission système.
- Copier la photo dans le stockage privé de l’application.
- Afficher les détails, image et dates de création/modification.
- Modifier un chèque et recalculer son rappel.
- Supprimer après confirmation explicite.

### 6.4 Liste

- Rechercher par bénéficiaire ou numéro de chèque.
- Filtrer selon les cinq options de statut disponibles.
- Trier par échéance, émission ou montant, dans les deux directions.
- Ouvrir la fiche d’un résultat.
- Signaler l’absence de résultats et proposer la création.

### 6.5 Réglages et sécurité

- Choisir un thème clair, sombre ou système.
- Activer ou désactiver la biométrie sous réserve de compatibilité et d’enrôlement.
- Changer le PIN après saisie du PIN courant; confirmer le nouveau PIN et choisir sa longueur.
- Verrouiller immédiatement l’application.

### 6.6 Export et sauvegarde

- Exporter et partager un CSV contenant bénéficiaire, montant, numéro, banque, dates, statut et note.
- Exporter un PDF détaillé par chèque, avec note et image lorsqu’elles existent.
- Créer et partager un JSON avec date d’export et enregistrements de chèques.
- Sélectionner un JSON pour restaurer en remplaçant les données courantes.
- Afficher un résultat de succès ou d’échec pour les opérations de partage/restauration.

## 7. Exigences non fonctionnelles

- **Hors ligne :** les principales fonctions n’utilisent pas de serveur; les chèques sont dans SQLite et les images dans le stockage privé local.
- **Protection :** accès contrôlé par PIN; les permissions de notification, caméra et galerie sont demandées selon le besoin.
- **Plateforme :** Expo/React Native, orientation portrait; Android est la cible de distribution la plus explicitement configurée.
- **Langue et formats :** interface française, dates fr-FR, montants MAD.
- **Thèmes :** mode clair, sombre et système.
- **Persistance :** index SQLite sur échéance, émission, montant, statut, bénéficiaire et numéro; migrations prévues pour l’identifiant historique et le champ image.
- **Fichiers :** création locale, puis partage via le mécanisme du système.
- **Distribution :** configuration EAS Build et Expo Updates présente.

## 8. Architecture technique constatée

- Interface et navigation : React Native, Expo Router, TypeScript; onglets Tableau de bord, Chèques et Réglages.
- Données : SQLite via expo-sqlite.
- Préférences : AsyncStorage.
- PIN : SecureStore et Expo Crypto.
- Biométrie : Expo Local Authentication.
- Notifications : Expo Notifications locales.
- Images : Expo Image Picker et Expo FileSystem.
- PDF : Expo Print; CSV et JSON : fichiers locaux; partage : Expo Sharing.
- Restauration : Expo Document Picker.

## 9. Critères d’acceptation

1. Un nouvel utilisateur peut créer et confirmer un PIN de 4 ou 6 chiffres avant d’accéder aux onglets.
2. L’accès aux onglets est refusé tant que l’utilisateur n’est pas authentifié; un PIN valide déverrouille l’application.
3. L’utilisateur peut créer, consulter, modifier et supprimer un chèque valide.
4. Un chèque actif passé à échéance prend le statut Expiré à la prochaine synchronisation pertinente.
5. Une échéance à plus de 48 heures déclenche un rappel à H-48 si les notifications sont autorisées; le refus de permission ne bloque pas la saisie.
6. La modification de l’échéance ou du statut resynchronise ou annule le rappel.
7. La recherche, les filtres et tris reflètent les critères choisis.
8. Le tableau de bord calcule les indicateurs depuis les données locales et limite la liste active à trois éléments.
9. Une photo est visible dans la fiche et incluse au PDF si le fichier existe encore.
10. CSV, PDF et JSON sont partageables depuis le terminal.
11. Une restauration valide remplace les données existantes; annuler le sélecteur ne les modifie pas.
12. L’utilisateur peut changer de thème, modifier son PIN après vérification, gérer la biométrie disponible et verrouiller l’application.

## 10. Décisions à confirmer pour une spécification contractuelle

Le code ne fixe pas les points suivants; ils nécessitent une décision produit :

- Profil utilisateur précis, usage personnel/professionnel et volume maximal de chèques.
- Versions minimales prises en charge et plateformes réellement garanties.
- MAD fixe ou devise configurable.
- Validité de la relation entre dates d’émission et d’échéance; montants maximum et précision acceptée.
- Rappel unique à 48 heures ou rappels configurables; gestion d’une permission refusée/révoquée.
- Verrouillage automatique en arrière-plan, délai d’inactivité, limitation des tentatives PIN et protection des exports.
- Versionnement et validation complète du JSON, gestion des images manquantes et éventuelle fusion.
- Transfert des données vers un nouvel appareil, sauvegardes automatiques et politique de rétention.
- Exigences d’accessibilité, langues, performances et politique de confidentialité.
- Comportement de reprise en cas d’échec d’initialisation SQLite ou Notifications.

## 11. Synthèse

Le projet est une application locale de suivi de chèques avec opérations de gestion, tableau de bord, rappels à 48 heures, images, exports et accès PIN/biométrie. Il ne constitue ni un service bancaire ni une solution synchronisée entre appareils. Ce document décrit les comportements constatés dans le code; les décisions de la section 10 doivent être tranchées avant de les considérer comme des engagements de livraison.

