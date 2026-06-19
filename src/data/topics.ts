export interface Topic {
  name: string;
  slug: string;
  gradient: string;
  icon: string;
  description: string;
  filterValue: string; // value to search/filter in MovieService
}

export const topics: Topic[] = [
  {
    name: "TOP IMDb",
    slug: "top-imdb",
    gradient: "from-amber-500 via-orange-600 to-red-600",
    icon: "star",
    description: "Những tác phẩm được đánh giá cao nhất bởi khán giả toàn cầu.",
    filterValue: "top-imdb"
  },
  {
    name: "Thuyết Minh",
    slug: "thuyet-minh",
    gradient: "from-emerald-500 via-teal-600 to-cyan-600",
    icon: "translate",
    description: "Xem phim dễ dàng hơn với thuyết minh chất lượng cao.",
    filterValue: "Thuyết Minh"
  },
  {
    name: "Phim 4K",
    slug: "phim-4k",
    gradient: "from-purple-500 via-indigo-600 to-blue-600",
    icon: "high_quality",
    description: "Trải nghiệm độ nét siêu thực 4K Ultra HD đỉnh cao.",
    filterValue: "4K"
  },
  {
    name: "Lồng Tiếng",
    slug: "phim-long-tieng",
    gradient: "from-fuchsia-500 via-pink-600 to-rose-600",
    icon: "volume_up",
    description: "Kho phim lồng tiếng Việt chuẩn rạp, biểu cảm cực mạnh.",
    filterValue: "Lồng Tiếng"
  },
  {
    name: "Netflix",
    slug: "netflix",
    gradient: "from-red-600 via-rose-700 to-orange-600",
    icon: "movie_filter",
    description: "Các bộ phim bom tấn độc quyền từ nền tảng Netflix.",
    filterValue: "Netflix"
  },
  {
    name: "Kinh Điển TVB",
    slug: "phim-tvb",
    gradient: "from-cyan-500 via-blue-600 to-indigo-600",
    icon: "tv",
    description: "Những thước phim hình sự và gia đấu TVB đi cùng năm tháng.",
    filterValue: "TVB"
  },
  {
    name: "Cổ Trang",
    slug: "co-trang",
    gradient: "from-rose-400 via-pink-500 to-red-500",
    icon: "history_edu",
    description: "Những bộ phim kiếm hiệp, cung đấu cổ trang hoành tráng.",
    filterValue: "Cổ Trang"
  },
  {
    name: "Chữa Lành",
    slug: "chua-lanh",
    gradient: "from-teal-400 via-emerald-500 to-green-500",
    icon: "spa",
    description: "Những câu chuyện ngọt ngào, nhẹ nhàng sưởi ấm tâm hồn.",
    filterValue: "Chữa lành"
  },
  {
    name: "Vũ Trụ Marvel",
    slug: "marvel",
    gradient: "from-blue-600 via-indigo-700 to-purple-800",
    icon: "shield",
    description: "Những trận chiến siêu anh hùng kịch tính của Marvel Studios.",
    filterValue: "Marvel"
  }
];
