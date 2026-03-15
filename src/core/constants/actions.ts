import type { ActionCostMap } from '../types/energy.types'

/**
 * Default energy cost for each automation action type.
 * These values can be overridden via energy.config.ts.
 */
export const ACTION_COSTS: ActionCostMap = {
  // Basic interactions
  click: 1,
  hover: 0,
  scroll: 2,
  keypress: 0,

  // Data operations
  scrape: 5,
  screenshot: 3,

  // Form automation
  formFill: 8,
  submitForm: 10,

  // Social media
  like: 1,
  follow: 3,
  unfollow: 3,
  comment: 5,
  share: 4,
  search: 2,

  // Navigation
  navigate: 2,

  // E-commerce
  addToCart: 5,
  checkout: 15,

  // CAPTCHA
  captchaAvoidance: 0,
} as const
