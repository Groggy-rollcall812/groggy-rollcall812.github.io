/* ============================================================
   本地存储 + 备份工具（所有工具页面共用）
   ------------------------------------------------------------
   数据存在浏览器 localStorage 里，只在这台设备上，不上传。
   所以每个工具都该提供导出/导入，防止误删或换设备时丢数据。

   用法：
     const store = new Store('notes');   // key 会变成 workbench.notes
     const items = store.load([]);       // 读，传默认值
     store.save(items);                  // 写

     store.exportFile();                 // 导出成 .json 文件
     store.importFile(data => { ... });  // 选文件导入，回调拿到数据
   ============================================================ */

class Store {
  constructor(name) {
    this.name = name;
    this.key = 'workbench.' + name;
  }

  /** 读数据。存储被禁用或数据损坏时返回默认值，不抛异常。 */
  load(fallback = null) {
    try {
      const raw = localStorage.getItem(this.key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  /** 写数据。返回是否成功，失败时调用方可以提示用户。 */
  save(value) {
    try {
      localStorage.setItem(this.key, JSON.stringify(value));
      return true;
    } catch (e) {
      // 隐私模式禁用存储，或容量超限
      alert('保存失败，可能是浏览器隐私模式或存储空间已满');
      return false;
    }
  }

  /** 导出成 json 文件下载。文件名带工具名和日期，方便区分。 */
  exportFile() {
    const payload = {
      tool: this.name,
      exportedAt: new Date().toISOString(),
      version: 1,
      data: this.load(null)
    };

    if (payload.data === null) {
      alert('还没有数据可以导出');
      return;
    }

    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.name}-${stamp}.json`;
    a.click();

    // 交给浏览器后即可释放
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /**
   * 弹出文件选择框导入。
   * @param {Function} onLoaded 校验通过后调用，参数是解析出的 data
   */
  importFile(onLoaded) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';

    input.onchange = () => {
      const file = input.files && input.files[0];
      if (!file) return;

      const reader = new FileReader();

      reader.onload = () => {
        let payload;
        try {
          payload = JSON.parse(reader.result);
        } catch {
          alert('这个文件不是有效的备份文件');
          return;
        }

        // 兼容两种格式：带 meta 的完整备份，或直接是裸数据
        const data = (payload && typeof payload === 'object' && 'data' in payload)
          ? payload.data
          : payload;

        if (data === null || data === undefined) {
          alert('备份文件里没有数据');
          return;
        }

        // 导错工具的备份是常见误操作，提醒但不强行拦
        if (payload.tool && payload.tool !== this.name) {
          const ok = confirm(
            `这份备份来自「${payload.tool}」，不是当前工具。仍然导入？`
          );
          if (!ok) return;
        }

        onLoaded(data);
      };

      reader.onerror = () => alert('读取文件失败');
      reader.readAsText(file);
    };

    input.click();
  }
}

window.Store = Store;
