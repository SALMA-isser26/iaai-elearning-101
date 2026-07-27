// src/utils/passwordPolicy.js
//
// Politique de mot de passe centralisée — utilisée à l'inscription et à la
// réinitialisation. Objectif : remplacer l'ancienne règle "6 caractères
// minimum" (trop faible, cf. OWASP ASVS 2.1) par des règles vérifiables,
// et donner un retour visuel en temps réel côté formulaire.
//
// Important : ceci reste une validation CÔTÉ CLIENT. Elle améliore l'UX et
// bloque les mots de passe évidemment faibles avant l'appel réseau, mais ne
// remplace pas une politique côté serveur — voir la note en bas de fichier.

export const PASSWORD_MIN_LENGTH = 10

const RULES = [
  { id: 'length', test: (pw) => pw.length >= PASSWORD_MIN_LENGTH, key: 'auth.password_policy.rule_length' },
  { id: 'lowercase', test: (pw) => /[a-z]/.test(pw), key: 'auth.password_policy.rule_lowercase' },
  { id: 'uppercase', test: (pw) => /[A-Z]/.test(pw), key: 'auth.password_policy.rule_uppercase' },
  { id: 'digit', test: (pw) => /[0-9]/.test(pw), key: 'auth.password_policy.rule_digit' },
  { id: 'special', test: (pw) => /[^A-Za-z0-9]/.test(pw), key: 'auth.password_policy.rule_special' },
]

// Petite liste de mots de passe/motifs trop courants pour être acceptés,
// même s'ils respectent les règles ci-dessus (ex: "Password123!" les respecte
// toutes mais reste un très mauvais mot de passe).
const COMMON_PASSWORDS = new Set([
  'password123', 'password1!', 'azertyuiop', 'motdepasse', 'motdepasse1',
  'qwertyuiop', 'iloveyou123', '123456789', '1234567890', 'admin1234',
  'welcome123', 'lettmein12',
])

/**
 * Retourne l'état de chaque règle pour affichage en temps réel
 * (ex: checklist "✓ 10 caractères, ✓ 1 majuscule, ✗ 1 chiffre...").
 */
export function checkPasswordRules(password = '') {
  return RULES.map((rule) => ({ id: rule.id, key: rule.key, passed: rule.test(password) }))
}

/**
 * Validation complète, à appeler avant tout appel à supabase.auth.
 * `context.email` / `context.fullName` sont optionnels : quand fournis, on
 * refuse un mot de passe qui contient l'identifiant de l'utilisateur.
 *
 * Retourne { valid, errors, checks } où `errors` est une liste de clés i18n
 * (traduire avec t()), triée du problème le plus basique au plus spécifique.
 */
export function validatePassword(password = '', context = {}) {
  const { email = '', fullName = '' } = context
  const checks = checkPasswordRules(password)
  const errors = checks.filter((c) => !c.passed).map((c) => c.key)

  const lower = password.toLowerCase()

  if (password.length > 0 && COMMON_PASSWORDS.has(lower)) {
    errors.push('auth.password_policy.rule_common')
  }

  const emailLocalPart = email.split('@')[0]?.toLowerCase()
  if (emailLocalPart && emailLocalPart.length >= 4 && lower.includes(emailLocalPart)) {
    errors.push('auth.password_policy.rule_contains_identity')
  }

  const nameParts = fullName.toLowerCase().split(/\s+/).filter((p) => p.length >= 4)
  if (nameParts.some((part) => lower.includes(part))) {
    errors.push('auth.password_policy.rule_contains_identity')
  }

  return { valid: errors.length === 0, errors: [...new Set(errors)], checks }
}

// ─── Note pour la soutenance ──────────────────────────────────────────────
// Cette validation client peut être contournée par un appel direct à l'API
// Supabase Auth (fetch vers /auth/v1/signup sans passer par le front). Pour
// une vraie défense en profondeur, la longueur minimale doit AUSSI être
// configurée côté Supabase : Dashboard → Authentication → Policies →
// Password requirements (ou "Minimum password length" selon la version),
// à fixer à 10. Le SDK JS n'expose pas ce réglage via une migration SQL,
// il est géré au niveau du service Auth (GoTrue), donc ça se fait dans le
// Dashboard et pas dans supabase/migrations/.
