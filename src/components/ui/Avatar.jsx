/**
 * Avatar — initiales colorées ou image de profil
 *
 * Usage :
 *   <Avatar name="Salma Isser" />
 *   <Avatar name="Youssef" size="lg" shape="square" />
 *   <Avatar src="/photos/user.jpg" name="Karim" size="sm" />
 *   <AvatarGroup users={[...]} max={4} />
 */


const SIZE_CLASSES = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-13 h-13 text-base',
  xl: 'w-16 h-16 text-lg',
};

const COLOR_PALETTES = [
  { bg: 'bg-purple-50 dark:bg-purple-950', text: 'text-purple-800 dark:text-purple-200' },
  { bg: 'bg-teal-50 dark:bg-teal-950',   text: 'text-teal-800 dark:text-teal-200' },
  { bg: 'bg-blue-50 dark:bg-blue-950',   text: 'text-blue-800 dark:text-blue-200' },
  { bg: 'bg-amber-50 dark:bg-amber-950', text: 'text-amber-800 dark:text-amber-200' },
  { bg: 'bg-rose-50 dark:bg-rose-950',   text: 'text-rose-800 dark:text-rose-200' },
  { bg: 'bg-green-50 dark:bg-green-950', text: 'text-green-800 dark:text-green-200' },
];

const getInitials = (name = '') =>
  name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');

const getColor = (name = '') => {
  const idx = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % COLOR_PALETTES.length;
  return COLOR_PALETTES[idx];
};

export const Avatar = ({
  name = '',
  src = null,
  size = 'md',
  shape = 'round',
  className = '',
  alt,
}) => {
  const initials = getInitials(name);
  const color = getColor(name);
  const radius = shape === 'square' ? 'rounded-lg' : 'rounded-full';
  const sizeClass = SIZE_CLASSES[size] ?? SIZE_CLASSES.md;

  return (
    <div
      className={[
        'inline-flex items-center justify-center shrink-0 overflow-hidden font-medium select-none',
        sizeClass,
        radius,
        !src ? `${color.bg} ${color.text}` : 'bg-gray-100 dark:bg-gray-800',
        className,
      ].join(' ')}
      aria-label={alt ?? name}
      role="img"
    >
      {src ? (
        <img src={src} alt={alt ?? name} className="w-full h-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
};

export const AvatarGroup = ({ users = [], max = 3, size = 'md' }) => {
  const visible = users.slice(0, max);
  const overflow = users.length - max;

  return (
    <div className="flex -space-x-2" aria-label={`${users.length} utilisateurs`}>
      {visible.map((u, i) => (
        <Avatar
          key={i}
          name={u.name}
          src={u.src}
          size={size}
          className="ring-2 ring-white dark:ring-gray-900"
        />
      ))}
      {overflow > 0 && (
        <div
          className={[
            'inline-flex items-center justify-center rounded-full font-medium text-xs',
            'ring-2 ring-white dark:ring-gray-900',
            'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
            SIZE_CLASSES[size],
          ].join(' ')}
          aria-label={`+${overflow} autres`}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
};

export default Avatar;
