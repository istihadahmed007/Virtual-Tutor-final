interface GrecaptchaBadge {
  hide(): void;
  show(): void;
  moveBelow(anchor: HTMLElement): void;
  reposition(): void;
}

interface GrecaptchaObject {
  ready(callback: () => void): void;
  execute(
    siteKey: string,
    options: { action: string },
  ): Promise<string>;
  enterprise?: GrecaptchaObject;
  badge: GrecaptchaBadge;
}

interface Window {
  grecaptcha?: GrecaptchaObject;
}
