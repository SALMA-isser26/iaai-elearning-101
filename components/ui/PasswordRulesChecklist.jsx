// src/components/ui/PasswordRulesChecklist.jsx
//
// Checklist en temps réel des règles de mot de passe (utils/passwordPolicy).
// N'apparaît que dès que l'utilisateur commence à taper, pour ne pas
// alourdir le formulaire visuellement au premier affichage.

function PasswordRulesChecklist({ checks }) {
  const started = checks.some((c) => c.passed) || checks.length === 0
  if (!started) return null

  return (
    <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
      {checks.map((check) => (
        <li
          key={check.id}
          className={`flex items-center gap-1.5 text-xs transition-colors ${
            check.passed ? 'text-emerald-600' : 'text-[#a19aa8]'
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">
            {check.passed ? 'check_circle' : 'radio_button_unchecked'}
          </span>
          <RuleLabel ruleKey={check.key} />
        </li>
      ))}
    </ul>
  )
}

// Libellés courts (indépendants de i18n pour l'instant, cf. clés
// auth.password_policy.* ajoutées dans fr.json/ar.json pour les messages
// d'erreur — ici on garde un affichage compact type "checklist").
const LABELS = {
  'auth.password_policy.rule_length': { fr: '10 caractères minimum', ar: '10 أحرف على الأقل' },
  'auth.password_policy.rule_lowercase': { fr: 'Une minuscule', ar: 'حرف صغير واحد' },
  'auth.password_policy.rule_uppercase': { fr: 'Une majuscule', ar: 'حرف كبير واحد' },
  'auth.password_policy.rule_digit': { fr: 'Un chiffre', ar: 'رقم واحد' },
  'auth.password_policy.rule_special': { fr: 'Un caractère spécial', ar: 'رمز خاص واحد' },
}

function RuleLabel({ ruleKey }) {
  const lang = document.documentElement.lang === 'ar' ? 'ar' : 'fr'
  return <span>{LABELS[ruleKey]?.[lang] ?? ruleKey}</span>
}

export default PasswordRulesChecklist
