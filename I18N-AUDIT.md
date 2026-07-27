# Audit i18n — IAAI eLearning 101

Date : 17 juillet 2026. État réel constaté dans le zip fourni (pas celui
d'une précédente estimation — voir note en bas).

## Constat

- **4 pages sur 34** utilisent `useTranslation()` / `t()` : `ForgotPasswordPage`,
  `CataloguePage` (déjà en place avant cette session), et `RegisterPage` +
  `ResetPasswordPage` (convertis pendant la phase 1 — mot de passe — de
  cette session).
- **30 pages** ont encore du texte français en dur, malgré des fichiers de
  locale `fr.json`/`ar.json` déjà riches (227 clés).
- Volume concerné : environ **10 900 lignes** de JSX à auditer/convertir
  sur les 30 fichiers restants.

## Priorisation proposée

### Groupe A — parcours apprenant, à traiter en premier (20 pages)
Ce sont les pages vues par tes utilisateurs finaux (le public cible du
projet : francophones ET arabophones). Rester en français en dur ici veut
dire qu'un visiteur qui choisit l'arabe voit un mélange des deux langues.

| Page | Priorité | Pourquoi |
|---|---|---|
| `Landing/LandingPage.jsx` | Critique | Première page vue par tout visiteur |
| `Auth/LoginPage.jsx` | Critique | Passage obligé pour tout utilisateur |
| `Auth/VerifyEmailPage.jsx` | Haute | Fait partie du tunnel d'inscription |
| `Dashboard/DashboardPage.jsx` | Critique | Page d'accueil post-connexion |
| `Onboarding/OnboardingPage.jsx` | Haute | Premier contact après inscription |
| `Learning/CurriculumPage.jsx` | Critique | Coeur du parcours pédagogique |
| `Learning/ModulePage.jsx` | Critique | Coeur du parcours pédagogique |
| `Learning/LessonPage.jsx` | Critique | Coeur du parcours pédagogique (le plus gros fichier) |
| `Quiz/QuizPage.jsx` | Haute | Évaluation, très visible |
| `Quiz/QuizResultPage.jsx` | Haute | Suite directe du quiz |
| `Certificates/CertificatesPage.jsx` | Moyenne | Valorisant mais moins fréquenté |
| `Community/CommunautePage.jsx` | Moyenne | Fonctionnalité secondaire |
| `Notifications/NotificationsPage.jsx` | Moyenne | Consultée régulièrement |
| `Profile/ProfilePage.jsx` | Moyenne | Consultée régulièrement |
| `Profile/BookmarksPage.jsx` | Basse | Fonctionnalité secondaire |
| `Search/SearchPage.jsx` | Moyenne | Consultée régulièrement |
| `Settings/SettingsPage.jsx` | Basse | Peu fréquentée |
| `Settings/UpgradePage.jsx` | Haute | Page de conversion payante — l'argument commercial doit parler la langue du visiteur |
| `Payment/PaymentSuccessPage.jsx` | Moyenne | Fin de tunnel de paiement |
| `NotFound/NotFoundPage.jsx` | Basse | Rapide à faire, gain facile |

### Groupe B — back-office admin, à traiter en second (10 pages)
Utilisé en interne par l'équipe IAAI Academy, pas par les apprenants.
Moins urgent — sauf si l'équipe elle-même a besoin de l'arabe.

`Admin/AdminHomePage.jsx`, `AdminAnalyticsPage.jsx`, `AdminCoursesPage.jsx`,
`AdminFAQsPage.jsx`, `AdminLessonsPage.jsx`, `AdminQuizzesPage.jsx`,
`AdminSettingsPage.jsx`, `AdminTestimonialsPage.jsx`, `AdminUsersPage.jsx`,
`AnalyticsPage.jsx`.

## Méthode recommandée par page

1. Repérer toutes les chaînes françaises en dur dans le JSX (texte visible,
   `placeholder`, `alt`, `title`, messages d'erreur).
2. Ajouter une clé structurée dans `fr.json` (namespace par page, ex.
   `dashboard.welcome_title`) et sa traduction dans `ar.json`.
3. Remplacer par `t('dashboard.welcome_title')`.
4. Vérifier le rendu RTL en arabe (le projet a déjà un support RTL global,
   mais les pages jamais testées en arabe peuvent avoir des débordements
   visuels une fois le texte plus long/à l'envers).

## Note sur l'écart avec une estimation précédente

Une estimation antérieure situait l'état à "2 pages sur 25". L'audit refait
aujourd'hui sur le code réel du zip montre 34 pages au total et un état
différent — le nombre de pages a grossi avec le projet, et l'état d'avancement
réel est celui décrit ci-dessus. C'est ce constat-ci qui fait foi.
