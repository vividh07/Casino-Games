import { motion, type HTMLMotionProps } from 'framer-motion'
import type { ReactNode } from 'react'

type Props = HTMLMotionProps<'button'> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

const variants = {
  primary:
    'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30',
  secondary: 'bg-white/10 text-white border border-white/15 hover:bg-white/15',
  ghost: 'bg-transparent text-slate-200 hover:bg-white/5',
  danger: 'bg-rose-500/90 text-white',
  gold: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-ink font-bold',
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm rounded-xl',
  md: 'px-4 py-2.5 text-sm rounded-2xl',
  lg: 'px-5 py-3.5 text-base rounded-2xl',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  children,
  ...rest
}: Props) {
  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.97 }}
      className={`inline-flex items-center justify-center font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...rest}
    >
      {children}
    </motion.button>
  )
}
