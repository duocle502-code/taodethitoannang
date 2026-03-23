// ============================================
// API KEY MANAGER — Quản lý nhiều key + tự xoay
// ============================================

const STORAGE_KEY = 'edugenvn_api_keys';
const COOLDOWN_MS = 5 * 60 * 1000; // 5 phút cooldown cho key bị rate limit

interface ManagedKey {
  key: string;
  label: string;
  status: 'active' | 'cooldown' | 'error';
  errorCount: number;
  cooldownUntil?: number;
}

class ApiKeyManager {
  private keys: ManagedKey[] = [];
  private currentIndex = 0;

  constructor() {
    this.loadFromStorage();
  }

  /** Load keys từ localStorage */
  private loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.keys = JSON.parse(saved);
        // Reset cooldown nếu đã qua thời hạn
        const now = Date.now();
        this.keys.forEach((k) => {
          if (k.status === 'cooldown' && k.cooldownUntil && now > k.cooldownUntil) {
            k.status = 'active';
            k.errorCount = 0;
            k.cooldownUntil = undefined;
          }
        });
      }
    } catch {
      this.keys = [];
    }

    // Migrate key cũ (gemini_api_key) nếu chưa có trong danh sách
    const legacyKey = localStorage.getItem('gemini_api_key');
    if (legacyKey && !this.keys.find((k) => k.key === legacyKey)) {
      this.keys.unshift({
        key: legacyKey,
        label: 'Key chính',
        status: 'active',
        errorCount: 0,
      });
    }

    this.saveToStorage();
  }

  /** Lưu keys vào localStorage */
  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.keys));
    } catch {
      // localStorage full — bỏ qua
    }
  }

  /** Đăng ký / cập nhật key */
  registerKey(key: string, label?: string) {
    const existing = this.keys.find((k) => k.key === key);
    if (existing) {
      existing.status = 'active';
      existing.errorCount = 0;
      existing.cooldownUntil = undefined;
      if (label) existing.label = label;
    } else {
      this.keys.unshift({
        key,
        label: label || `Key ${this.keys.length + 1}`,
        status: 'active',
        errorCount: 0,
      });
    }
    this.currentIndex = this.keys.findIndex((k) => k.key === key);
    this.saveToStorage();
  }

  /** Lấy key đang active */
  getActiveKey(): string | null {
    // Ưu tiên key ở currentIndex
    if (this.keys[this.currentIndex]?.status === 'active') {
      return this.keys[this.currentIndex].key;
    }
    // Tìm key active khác
    const activeKey = this.keys.find((k) => k.status === 'active');
    return activeKey?.key || null;
  }

  /** Đánh dấu key lỗi và thử xoay sang key khác */
  markKeyError(
    key: string,
    errorType: string,
  ): { success: boolean; newKey: string | null; message: string } {
    const entry = this.keys.find((k) => k.key === key);
    if (entry) {
      entry.errorCount++;
      if (errorType === 'QUOTA_EXCEEDED' || errorType === 'RATE_LIMIT') {
        entry.status = 'cooldown';
        entry.cooldownUntil = Date.now() + COOLDOWN_MS;
      } else {
        entry.status = 'error';
      }
    }
    this.saveToStorage();
    return this.rotateToNextKey(errorType);
  }

  /** Xoay sang key tiếp theo */
  rotateToNextKey(reason: string): { success: boolean; newKey: string | null; message: string } {
    const now = Date.now();

    // Reset các key đã hết cooldown
    this.keys.forEach((k) => {
      if (k.status === 'cooldown' && k.cooldownUntil && now > k.cooldownUntil) {
        k.status = 'active';
        k.errorCount = 0;
        k.cooldownUntil = undefined;
      }
    });

    // Tìm key active tiếp theo
    for (let i = 0; i < this.keys.length; i++) {
      const idx = (this.currentIndex + 1 + i) % this.keys.length;
      if (this.keys[idx].status === 'active') {
        this.currentIndex = idx;
        this.saveToStorage();
        return {
          success: true,
          newKey: this.keys[idx].key,
          message: `Đã chuyển sang ${this.keys[idx].label} (${reason})`,
        };
      }
    }

    return {
      success: false,
      newKey: null,
      message: 'Tất cả API key đều đã hết quota. Hãy thêm key mới hoặc chờ 5 phút.',
    };
  }

  /** Reset tất cả key về trạng thái active */
  resetAllKeys() {
    this.keys.forEach((k) => {
      k.status = 'active';
      k.errorCount = 0;
      k.cooldownUntil = undefined;
    });
    this.currentIndex = 0;
    this.saveToStorage();
  }

  /** Số key đang quản lý */
  get totalKeys(): number {
    return this.keys.length;
  }

  /** Số key còn active */
  get activeKeyCount(): number {
    return this.keys.filter((k) => k.status === 'active').length;
  }
}

export const apiKeyManager = new ApiKeyManager();
