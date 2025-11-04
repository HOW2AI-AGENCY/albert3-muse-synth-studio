// Типы анимаций и их параметры вынесены в отдельный файл,
// чтобы файлы компонентов экспортировали только React-компоненты

export type AnimationType =
  | 'fadeIn'
  | 'fadeOut'
  | 'slideUp'
  | 'slideDown'
  | 'slideLeft'
  | 'slideRight'
  | 'scaleIn'
  | 'scaleOut'
  | 'bounceIn'
  | 'elastic'
  | 'materialSlide'
  | 'materialFade';

export type EasingFunction =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'materialStandard'
  | 'materialDecelerate'
  | 'materialAccelerate'
  | 'materialSharp';

export interface AnimationConfig {
  duration?: number;
  delay?: number;
  easing?: EasingFunction;
  fillMode?: 'forwards' | 'backwards' | 'both' | 'none';
  iterations?: number | 'infinite';
}