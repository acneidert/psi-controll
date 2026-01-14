import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ClassValue } from 'clsx'

//teste
export function cn(...inputs: Array<ClassValue>) {
  return twMerge(clsx(inputs))
}
