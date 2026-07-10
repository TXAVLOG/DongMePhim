export class TxaSchedule {
  /**
   * Tự động tạo nội dung thông báo lịch chiếu phim động tùy theo phân loại phim (lẻ/bộ) và trạng thái tập.
   */
  static generateNotice(
    nextDate: string | null | undefined,
    nextTime: string | null | undefined,
    nextEpisode: string | null | undefined,
    movieType?: string | null
  ): string {
    if (!nextDate) return '';

    // Định dạng ngày từ YYYY-MM-DD sang DD-MM-YYYY
    const dateParts = nextDate.split('-');
    const formattedDate = dateParts.length === 3 ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}` : nextDate;
    const timeStr = nextTime ? `${nextTime} ` : '';
    const fullTime = `${timeStr}ngày ${formattedDate}`;

    const epStr = nextEpisode ? nextEpisode.trim() : '';
    const type = movieType ? movieType.toLowerCase() : 'series';
    const isSingle = type === 'movie' || type === 'single';

    if (isSingle) {
      if (epStr.toLowerCase() === 'full') {
        return `Trọn bộ bản đẹp sẽ phát sóng vào ${fullTime}`;
      }
      return `Phim sẽ phát sóng vào ${fullTime}`;
    } else {
      if (epStr.toLowerCase() === 'full') {
        return `Trọn bộ sẽ phát sóng vào ${fullTime}`;
      }
      if (epStr.toLowerCase() === 'tập cuối' || epStr.toLowerCase() === 'tap cuoi') {
        return `Tập cuối sẽ phát sóng vào ${fullTime}`;
      }

      // Xử lý viết hoa chữ "Tập" và chuẩn hóa
      let capitalizedEp = epStr;
      if (epStr.toLowerCase().startsWith('tập')) {
        capitalizedEp = 'Tập' + epStr.slice(3);
      } else if (epStr.toLowerCase().startsWith('tap')) {
        capitalizedEp = 'Tập' + epStr.slice(3);
      } else if (/^\d+$/.test(epStr)) {
        capitalizedEp = `Tập ${epStr}`;
      } else if (!capitalizedEp) {
        capitalizedEp = 'Tập tiếp theo';
      }

      return `${capitalizedEp} sẽ phát sóng vào ${fullTime}`;
    }
  }

  /**
   * Kiểm tra xem lịch phát sóng tổng có đang kích hoạt (thời điểm chiếu ở tương lai) hay không.
   */
  static isScheduleActive(nextDate: string | null | undefined, nextTime: string | null | undefined): boolean {
    if (!nextDate) return false;
    let targetDateTimeStr = `${nextDate}T00:00:00+07:00`;
    if (nextTime) {
      const parts = nextTime.split(':');
      if (parts.length === 2) {
        targetDateTimeStr = `${nextDate}T${nextTime}:00+07:00`;
      } else {
        targetDateTimeStr = `${nextDate}T${nextTime}+07:00`;
      }
    }
    try {
      const targetDate = new Date(targetDateTimeStr).getTime();
      return Date.now() < targetDate;
    } catch (e) {
      return false;
    }
  }

  /**
   * Xác định xem một tập phim có bị ẩn (chưa chiếu) hay không.
   * Dựa vào chỉ số tập phim và cấu hình lịch phát sóng tổng.
   */
  static isEpisodeUnreleased(
    epName: string,
    epIndex: number,
    eplist: any[],
    broadcastSchedule: { nextDate?: string; nextTime?: string; nextEpisode?: string; next_episode?: string } | null | undefined
  ): boolean {
    if (!broadcastSchedule || !broadcastSchedule.nextDate) {
      return false;
    }

    const nextDate = broadcastSchedule.nextDate;
    const nextTime = broadcastSchedule.nextTime;
    const nextEpisode = broadcastSchedule.nextEpisode || broadcastSchedule.next_episode;

    // Nếu lịch tổng đã trôi qua, tức là tập đã được phát sóng
    if (!this.isScheduleActive(nextDate, nextTime)) {
      return false;
    }

    if (!nextEpisode) {
      return false;
    }

    const normNextEp = nextEpisode.trim().toLowerCase();
    const normEpName = epName.trim().toLowerCase();

    // 1. Nếu nextEpisode chỉ định là "Full", ẩn tất cả các tập
    if (normNextEp === 'full') {
      return true;
    }

    // 2. Nếu nextEpisode là "Tập cuối", ẩn tập phim cuối cùng trong danh sách
    if ((normNextEp === 'tập cuối' || normNextEp === 'tap cuoi') && epIndex === eplist.length - 1) {
      return true;
    }

    // 3. Tìm vị trí của tập trùng khớp với nextEpisode
    // Rút gọn tiền tố số tập để so sánh chính xác hơn (Ví dụ: "Tập 25" -> "25", "25" -> "25")
    const cleanNextEp = normNextEp.replace(/^(tập|tap|ep|episode|ep-|-)+\s*/g, '');
    
    let matchIndex = -1;
    for (let i = 0; i < eplist.length; i++) {
      const item = eplist[i];
      const itemName = (item.name || '').trim().toLowerCase();
      const cleanItemName = itemName.replace(/^(tập|tap|ep|episode|ep-|-)+\s*/g, '');
      
      if (cleanItemName === cleanNextEp || itemName.includes(normNextEp)) {
        matchIndex = i;
        break;
      }
    }

    // Nếu tìm thấy vị trí tập tiếp theo đang chờ chiếu, ẩn mọi tập từ vị trí đó trở đi
    if (matchIndex !== -1 && epIndex >= matchIndex) {
      return true;
    }

    return false;
  }
}
