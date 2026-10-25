import { requireId } from './dom';

export abstract class Screen {
  protected readonly root: HTMLElement;

  protected constructor(rootId: string) {
    this.root = requireId(rootId);
  }

  hide(): void {
    this.root.classList.remove('is-active');
    this.root.hidden = true;
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && this.root.contains(activeElement)) {
      activeElement.blur();
    }
  }

  protected showRoot(): void {
    this.root.hidden = false;
    this.root.classList.add('is-active');
  }

  protected focusWhenShown(element: HTMLElement): void {
    requestAnimationFrame(() => {
      element.focus({ preventScroll: true });
    });
  }
}
