export class SendLock {
  private held = false;

  begin(): boolean {
    if (this.held) return false;
    this.held = true;
    return true;
  }

  end(): void {
    this.held = false;
  }
}
