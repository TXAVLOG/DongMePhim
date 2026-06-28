import type { IMovieProvider, Movie, MovieDetail } from '@apptypes/movie';

export const seedMovies: Movie[] = [
  {
    id: "m1",
    title: "Bài Học Đáng Đời",
    originalTitle: "The Glory",
    slug: "bai-hoc-dang-doi",
    description: "Khi kỷ cương trong trường học sụp đổ, những thành trì đạo đức cuối cùng dần mất đi sự tôn nghiêm. Một câu chuyện gai góc về giáo dục, sự trừng phạt và những giá trị nhân bản bị lãng quên.",
    posterUrl: "https://lh3.googleusercontent.com/aida/AP1WRLs0cwmsQtUMxz8S1kYIBe2vdzk9wlKrAYAA0SaImKjlJwYFoNlbX5Ezes6Vk4D5W-ucCQ2T9RmBKbr_ZMBabRA9Ttc6dmERubqhLsdx1wunz3brbgXi5rroXOR2ruzik_0pwCF5YxH6Uvl1XXNB5hThMgn1BnmAaijvACGEDvmqkuTyiOamRT4EaIM9cR5bB6VIsLFANxSFbHoSZwiBE2ropgLTIEGcBH_t4b9HchPMwtxA3L-vMixjNaq2",
    bannerUrl: "https://lh3.googleusercontent.com/aida/AP1WRLs0cwmsQtUMxz8S1kYIBe2vdzk9wlKrAYAA0SaImKjlJwYFoNlbX5Ezes6Vk4D5W-ucCQ2T9RmBKbr_ZMBabRA9Ttc6dmERubqhLsdx1wunz3brbgXi5rroXOR2ruzik_0pwCF5YxH6Uvl1XXNB5hThMgn1BnmAaijvACGEDvmqkuTyiOamRT4EaIM9cR5bB6VIsLFANxSFbHoSZwiBE2ropgLTIEGcBH_t4b9HchPMwtxA3L-vMixjNaq2",
    releaseYear: 2024,
    durationMinutes: "45 phút/tập",
    type: "series",
    status: "ongoing",
    episodeCurrent: "12",
    episodeTotal: "16",
    quality: "FHD",
    lang: "Vietsub",
    imdbScore: 10.0,
    views: 9500,
    commentCount: 420,
    category: "Hàn Quốc",
    ageRating: "T18",
    genres: ["Kịch Tính", "Học Đường", "Tâm Lý"],
    seasons: "Phần 1"
  },
  {
    id: "m2",
    title: "Hyeri Yêu Dấu",
    originalTitle: "Dear Hyeri",
    slug: "hyeri-yeu-dau",
    description: "Một bộ phim chữa lành tâm hồn xoay quanh một phát thanh viên mắc hội chứng rối loạn nhận dạng phân ly và bạn trai cũ của cô ấy.",
    posterUrl: "https://lh3.googleusercontent.com/aida/AP1WRLuO6KpL4MWKknm8mFvjIZPSY4YBrZyq_71GCcSte_U3eMOYxus5HxfYZ9PigFtZi-oDK15E-Cjzp2hXYfJ_GHzrJJKIlX8Bg1xpXfqfKvSELRjoBCaXdUC5mxRycPk60HvAwDOHGEEPBdvStM3Sb3txVvEs_V-AY30knzPYp-ELQUkk3RmcDcL-CTo2VrZMC43rH48cNSzwsmX3NkMjXHrEVLY7Ay04IIk_wODemFeS2Ng16LSfF5ea7MSh",
    bannerUrl: "https://lh3.googleusercontent.com/aida/AP1WRLuO6KpL4MWKknm8mFvjIZPSY4YBrZyq_71GCcSte_U3eMOYxus5HxfYZ9PigFtZi-oDK15E-Cjzp2hXYfJ_GHzrJJKIlX8Bg1xpXfqfKvSELRjoBCaXdUC5mxRycPk60HvAwDOHGEEPBdvStM3Sb3txVvEs_V-AY30knzPYp-ELQUkk3RmcDcL-CTo2VrZMC43rH48cNSzwsmX3NkMjXHrEVLY7Ay04IIk_wODemFeS2Ng16LSfF5ea7MSh",
    releaseYear: 2024,
    durationMinutes: "60 phút/tập",
    type: "series",
    status: "ongoing",
    episodeCurrent: "4",
    episodeTotal: "16",
    quality: "HD",
    lang: "Vietsub",
    imdbScore: 8.5,
    views: 8200,
    commentCount: 310,
    category: "Hàn Quốc",
    ageRating: "T16",
    genres: ["Tình Cảm", "Tâm Lý", "Lãng Mạn"],
    seasons: "Phần 1"
  },
  {
    id: "m3",
    title: "Nghệ Thuật Lừa Dối",
    originalTitle: "The Art of Deception",
    slug: "nghe-thuat-lua-doi",
    description: "Một phi vụ thế kỷ kịch tính về những kẻ lừa đảo siêu hạng hoạt động trong giới thượng lưu.",
    posterUrl: "https://lh3.googleusercontent.com/aida/AP1WRLvm-KnVg4nBEHswFKKhesNV70CJMm6igqUtinLPPrIJ_4Kcn3TrZB8WxUim06kwLSgvkpoJLz_Fsw1ZsJR_AjlZfOLNewlWmYB0w1kkBq5yAjrC2iFRnKdgYNfPBrDj7MBvwsFGMfQqFraz3DHFBzR74sDJtNikr4oTdppPL4qoa5EUpOjZXDARYm6n8DogRqs8I3whgQpr5Ii6reom2PW6AmEA0tKU235oyiaF_D10hGqcDoafAV6uuyd5",
    bannerUrl: "https://lh3.googleusercontent.com/aida/AP1WRLvm-KnVg4nBEHswFKKhesNV70CJMm6igqUtinLPPrIJ_4Kcn3TrZB8WxUim06kwLSgvkpoJLz_Fsw1ZsJR_AjlZfOLNewlWmYB0w1kkBq5yAjrC2iFRnKdgYNfPBrDj7MBvwsFGMfQqFraz3DHFBzR74sDJtNikr4oTdppPL4qoa5EUpOjZXDARYm6n8DogRqs8I3whgQpr5Ii6reom2PW6AmEA0tKU235oyiaF_D10hGqcDoafAV6uuyd5",
    releaseYear: 2023,
    durationMinutes: "120 phút",
    type: "movie",
    status: "completed",
    episodeCurrent: "Full",
    episodeTotal: "1",
    quality: "4K",
    lang: "Thuyết Minh",
    imdbScore: 7.2,
    views: 4500,
    commentCount: 80,
    category: "Âu Mỹ",
    ageRating: "T16",
    genres: ["Hành Động", "Tội Phạm", "Giật Gân"],
    seasons: "Bản Điện Ảnh"
  },
  {
    id: "m4",
    title: "Bậc Thầy Giải Hòa",
    originalTitle: "The Mediator",
    slug: "bac-thay-giai-hoa",
    description: "Một chuyên gia giải quyết xung đột bằng cách thấu hiểu tâm lý và tài biện hộ tài tình đã dấn thân vào các vụ tranh chấp hài hước.",
    posterUrl: "https://lh3.googleusercontent.com/aida/AP1WRLsohDUhkIkESPFFcrxCvncMlDGTnF6SKHWfNvxemTj0ETR7_-uvCDT24bGETBUIYD2a9tI-TYDHRm9qyFTPVT2XI8acDiKKsgLkKT80JpCOom3QhHCd8uxHLPbKohufSlTCdZ6TCQXQNA8rrzkHtHEw4qpYA2xz0E6gNoc6Gxa5XpFLQzG9aNy5aM7GOk6dyggEuCGD5wfphNuFaXSvy4ah6VvDCwx1JQHfD-TI_EIYhdllGEZPE6TgFV0K",
    bannerUrl: "https://lh3.googleusercontent.com/aida/AP1WRLsohDUhkIkESPFFcrxCvncMlDGTnF6SKHWfNvxemTj0ETR7_-uvCDT24bGETBUIYD2a9tI-TYDHRm9qyFTPVT2XI8acDiKKsgLkKT80JpCOom3QhHCd8uxHLPbKohufSlTCdZ6TCQXQNA8rrzkHtHEw4qpYA2xz0E6gNoc6Gxa5XpFLQzG9aNy5aM7GOk6dyggEuCGD5wfphNuFaXSvy4ah6VvDCwx1JQHfD-TI_EIYhdllGEZPE6TgFV0K",
    releaseYear: 2024,
    durationMinutes: "55 phút/tập",
    type: "series",
    status: "completed",
    episodeCurrent: "12",
    episodeTotal: "12",
    quality: "FHD",
    lang: "Vietsub",
    imdbScore: 8.0,
    views: 4500,
    commentCount: 150,
    category: "Hàn Quốc",
    ageRating: "T13",
    genres: ["Hài Hước", "Đời Thường", "Tâm Lý"],
    seasons: "Phần 1"
  },
  {
    id: "m5",
    title: "Cầu Truyền Hình",
    originalTitle: "Signal",
    slug: "cau-truyen-hinh",
    description: "Bộ phim trinh thám hình sự đình đám về chiếc bộ đàm kết nối hai cảnh sát ở quá khứ và hiện tại để giải mã hàng loạt vụ án mạng.",
    posterUrl: "https://lh3.googleusercontent.com/aida/AP1WRLskEpjrTbHRx6Jj3TAoagePHNQcXAyfE57exarNW0uRrctCdcc2Ns3Gccg-Q-sHR-iGafdXbWGBY3VqNGMMuNWRowyO8JZHlFLslh1G5WNrcjJ3y-OsTKgIzQGIYkOO5N88CKrVCPSenE4g8yUwk_MMtWZukOp8Pey1U0z24BjmBKodM448SynZ3QPSKC1mnooHd98SJMI_XxGvi66yl7YdJWaJyz_WDpl2GVANjq5HCB5SoVUfM8sY3Auj",
    bannerUrl: "https://lh3.googleusercontent.com/aida/AP1WRLskEpjrTbHRx6Jj3TAoagePHNQcXAyfE57exarNW0uRrctCdcc2Ns3Gccg-Q-sHR-iGafdXbWGBY3VqNGMMuNWRowyO8JZHlFLslh1G5WNrcjJ3y-OsTKgIzQGIYkOO5N88CKrVCPSenE4g8yUwk_MMtWZukOp8Pey1U0z24BjmBKodM448SynZ3QPSKC1mnooHd98SJMI_XxGvi66yl7YdJWaJyz_WDpl2GVANjq5HCB5SoVUfM8sY3Auj",
    releaseYear: 2024,
    durationMinutes: "65 phút/tập",
    type: "series",
    status: "ongoing",
    episodeCurrent: "8",
    episodeTotal: "16",
    quality: "FHD",
    lang: "Vietsub",
    imdbScore: 9.2,
    views: 7800,
    commentCount: 290,
    category: "Hàn Quốc",
    ageRating: "T16",
    genres: ["Hình Sự", "Kịch Tính", "Bí Ẩn"],
    seasons: "Phần 1"
  },
  {
    id: "m6",
    title: "Hậu Lãng",
    originalTitle: "Gen Z",
    slug: "hau-lang",
    description: "Bộ phim tôn vinh truyền thống y học cổ truyền Trung Hoa thông qua góc nhìn tràn đầy sức trẻ của thế hệ Gen Z kế thừa.",
    posterUrl: "https://lh3.googleusercontent.com/aida/AP1WRLs-Z_SdVW9CmqDFmsduFKIJ3icoeU0qW2TtEjnSlx9F7zjlit3Cb-L_Ilv_bI57jym9jRlS3pZA_Bwbo1g6NzgmrwqKOARjcuwVlG_rmyb1qFReSW5w8kZ0yl2-g_LuO-FUy8AZRJF_68mlqQNqSiGiZX2QsoRww__exJUlOe9wsxckYX1cTyxNcMakhDF_G2u-AEeYiSQL-Qyj83drPSSTpR8UJHfbz8SxgEcg5JaupJGUitJCig-1wPol",
    bannerUrl: "https://lh3.googleusercontent.com/aida/AP1WRLs-Z_SdVW9CmqDFmsduFKIJ3icoeU0qW2TtEjnSlx9F7zjlit3Cb-L_Ilv_bI57jym9jRlS3pZA_Bwbo1g6NzgmrwqKOARjcuwVlG_rmyb1qFReSW5w8kZ0yl2-g_LuO-FUy8AZRJF_68mlqQNqSiGiZX2QsoRww__exJUlOe9wsxckYX1cTyxNcMakhDF_G2u-AEeYiSQL-Qyj83drPSSTpR8UJHfbz8SxgEcg5JaupJGUitJCig-1wPol",
    releaseYear: 2023,
    durationMinutes: "45 phút",
    type: "series",
    status: "completed",
    episodeCurrent: "40",
    episodeTotal: "40",
    quality: "FHD",
    lang: "Vietsub",
    imdbScore: 8.8,
    views: 6100,
    commentCount: 180,
    category: "Trung Quốc",
    ageRating: "T13",
    genres: ["Y Học", "Đời Thường", "Tình Cảm"],
    seasons: "Phần 1"
  },
  {
    id: "m7",
    title: "Anh Cũng Có Ngày Này",
    originalTitle: "My Boss",
    slug: "anh-cung-co-ngay-nay",
    description: "Mối tình công sở oan gia ngõ hẹp và hài hước giữa cô nàng luật sư trẻ tuổi và ông chủ nghiêm khắc tài ba.",
    posterUrl: "https://lh3.googleusercontent.com/aida/AP1WRLs8BmnoZc1fsVLcDnKlloVfl7ptVYilZEiLps0IOV5QrdXCbBCdTAPZQd_oh6ZOWbMTbVeIeM5LRS7mt8rsMfy23zH8VMNx0cOiRXsMUl0IQ5kYztC61xtIg5VN-Z-h2de90bPruFqibkf0OIU6njNQr2CzgsukAAZ3mjfOQpf0q4BCKaxJAk8jpMXKvis6FSJyBzEMyqGc3-DpTM9Cnv8_4rkYNCsjQlL8x9B4LaRTep_0ndmtbvOzqzLY",
    bannerUrl: "https://lh3.googleusercontent.com/aida/AP1WRLs8BmnoZc1fsVLcDnKlloVfl7ptVYilZEiLps0IOV5QrdXCbBCdTAPZQd_oh6ZOWbMTbVeIeM5LRS7mt8rsMfy23zH8VMNx0cOiRXsMUl0IQ5kYztC61xtIg5VN-Z-h2de90bPruFqibkf0OIU6njNQr2CzgsukAAZ3mjfOQpf0q4BCKaxJAk8jpMXKvis6FSJyBzEMyqGc3-DpTM9Cnv8_4rkYNCsjQlL8x9B4LaRTep_0ndmtbvOzqzLY",
    releaseYear: 2024,
    durationMinutes: "45 phút/tập",
    type: "series",
    status: "completed",
    episodeCurrent: "36",
    episodeTotal: "36",
    quality: "FHD",
    lang: "Vietsub",
    imdbScore: 8.6,
    views: 6800,
    commentCount: 220,
    category: "Trung Quốc",
    ageRating: "T13",
    genres: ["Tình Cảm", "Hài Hước", "Lãng Mạn"],
    seasons: "Phần 1"
  },
  {
    id: "m8",
    title: "Mùa Rực Rỡ Của Em",
    originalTitle: "Our Glamorous Time",
    slug: "mua-ruc-ro-cua-em",
    description: "Bộ phim ngôn tình thương trường đô thị kịch tính, lôi cuốn xoay quanh sự nghiệp và tình yêu bền chặt.",
    posterUrl: "https://lh3.googleusercontent.com/aida/AP1WRLt9wj9WmPwSBa6rMEyb4Us-vMwCiX1W5l3QNugPMYx-avb0MQS-qDCmbZ69nc8tP8XsMPoYWIrJDB7hLtHsstwkO08IN_0pg6M9dED-RKUwsH_i2Po6zQZmaR0BYgcpsUZEgsncaBRI_BbP0SWzpewzN3LO2iKs38QTSr2oby8n1uYpd_5AUa7B_HPNYxbisMTSstVapKUc7XiA1L2sqblPaO5WLMgGk_2pdDhLjMPVuEwXEUnNrIVcYhU6",
    bannerUrl: "https://lh3.googleusercontent.com/aida/AP1WRLt9wj9WmPwSBa6rMEyb4Us-vMwCiX1W5l3QNugPMYx-avb0MQS-qDCmbZ69nc8tP8XsMPoYWIrJDB7hLtHsstwkO08IN_0pg6M9dED-RKUwsH_i2Po6zQZmaR0BYgcpsUZEgsncaBRI_BbP0SWzpewzN3LO2iKs38QTSr2oby8n1uYpd_5AUa7B_HPNYxbisMTSstVapKUc7XiA1L2sqblPaO5WLMgGk_2pdDhLjMPVuEwXEUnNrIVcYhU6",
    releaseYear: 2023,
    durationMinutes: "45 phút/tập",
    type: "series",
    status: "completed",
    episodeCurrent: "30",
    episodeTotal: "30",
    quality: "FHD",
    lang: "Vietsub",
    imdbScore: 8.2,
    views: 7900,
    commentCount: 250,
    category: "Trung Quốc",
    ageRating: "T13",
    genres: ["Tình Cảm", "Đô Thị", "Thương Trường"],
    seasons: "Phần 1"
  },
  {
    id: "m9",
    title: "Cảnh Sát 911",
    originalTitle: "9-1-1",
    slug: "canh-sat-911",
    description: "Bộ phim hành động căng thẳng, tái hiện các cuộc gọi khẩn cấp của lực lượng cứu hộ và phản ứng nhanh tại Mỹ.",
    posterUrl: "https://lh3.googleusercontent.com/aida/AP1WRLv1BV6kUWoqlUgqQKAvp8W9LOrDlb04B_4pVbkKHUg2gZ_40q9chWggYDx8avAuJsR2Y0ei3VNff9j7Y1Cwh5EH7ee6unYYs3q-xJthppgDHDguBsKMzYXPtDnNPUpqG8Buw2Ja0MY36rfZ6gMx9vC6jwd4BgTy7AYp9DMLelHteOcVpaV3UCHFDs7fkHy-aAF6mwhNRw_dmG9w6KsLjqeb60CCVQxMr4OCyEbEzWkR2Du6wdHYTJYVQl9F",
    bannerUrl: "https://lh3.googleusercontent.com/aida/AP1WRLv1BV6kUWoqlUgqQKAvp8W9LOrDlb04B_4pVbkKHUg2gZ_40q9chWggYDx8avAuJsR2Y0ei3VNff9j7Y1Cwh5EH7ee6unYYs3q-xJthppgDHDguBsKMzYXPtDnNPUpqG8Buw2Ja0MY36rfZ6gMx9vC6jwd4BgTy7AYp9DMLelHteOcVpaV3UCHFDs7fkHy-aAF6mwhNRw_dmG9w6KsLjqeb60CCVQxMr4OCyEbEzWkR2Du6wdHYTJYVQl9F",
    releaseYear: 2024,
    durationMinutes: "45 phút/tập",
    type: "series",
    status: "ongoing",
    episodeCurrent: "10",
    episodeTotal: "18",
    quality: "4K",
    lang: "Thuyết Minh",
    imdbScore: 8.9,
    views: 8900,
    commentCount: 330,
    category: "Âu Mỹ",
    ageRating: "T16",
    genres: ["Hành Động", "Kịch Tính", "Giải Cứu"],
    seasons: "Phần 7"
  },
  {
    id: "m10",
    title: "Phi Vụ Băng Trộm 2",
    originalTitle: "The Heist 2",
    slug: "phi-vu-bang-trom-2",
    description: "Màn tái hợp của những tay trộm đẳng cấp thế giới tham gia vào một phi vụ khó tin nhất lịch sử.",
    posterUrl: "https://lh3.googleusercontent.com/aida/AP1WRLvV9cq1gwNJQee94xcMFrRdybELN0AkXsT1QFjSMvnMHUb9UysXaCQDOHzphfKTIqGf2nOVg20b4fukgHCq577VrNRQw99Z4o6PxnTfcOm_PNzW8yBC5a-gpimZ-v1Dp0R3E0fZDpgmDL18UG2bkhrNFDurNJaIU2URW-LgXzjpFAswkPsuJ66ytdxGEwl2yzUdULMrHRsyKEd5xaoY8UWecAE4kbPYXM3V1p1YaM7ADghoemhRgabqXARq",
    bannerUrl: "https://lh3.googleusercontent.com/aida/AP1WRLvV9cq1gwNJQee94xcMFrRdybELN0AkXsT1QFjSMvnMHUb9UysXaCQDOHzphfKTIqGf2nOVg20b4fukgHCq577VrNRQw99Z4o6PxnTfcOm_PNzW8yBC5a-gpimZ-v1Dp0R3E0fZDpgmDL18UG2bkhrNFDurNJaIU2URW-LgXzjpFAswkPsuJ66ytdxGEwl2yzUdULMrHRsyKEd5xaoY8UWecAE4kbPYXM3V1p1YaM7ADghoemhRgabqXARq",
    releaseYear: 2024,
    durationMinutes: "115 phút",
    type: "movie",
    status: "completed",
    episodeCurrent: "Full",
    episodeTotal: "1",
    quality: "4K",
    lang: "Vietsub",
    imdbScore: 8.1,
    views: 4500,
    commentCount: 95,
    category: "Âu Mỹ",
    ageRating: "T16",
    genres: ["Hành Động", "Tội Phạm", "Giật Gân"],
    seasons: "Bản Điện Ảnh"
  },
  {
    id: "m11",
    title: "Tập Làm Người Xấu",
    originalTitle: "Breaking Bad",
    slug: "tap-lam-nguoi-xau",
    description: "Bộ phim truyền hình huyền thoại về hành trình sa ngã của một giáo viên hóa học cấp 3 trở thành ông trùm ma túy khét tiếng.",
    posterUrl: "https://lh3.googleusercontent.com/aida/AP1WRLvjwDgklPmuZVpHmBNKrFMOe0YcxqMcTW3rJLI8AOZ391aWD_lSLzmg1aSerhFhNPdJxRGdpHkzXMRE9f2u6eqfLHXF8BTXZLZ2nLIZ-NSID01d9YZiA6OkWGXIJiosDSlA9QsrQTCjUJhFvEhTcp4AbSd2XC_6Y_DCo37h0DkWoDyEckCBh-8b-N1pylGgriCvbrIXsAFU4u1-Tr6ZHbGDTl34BtgpV13mys7HCscUUYIUxc-pmTuzxGxC",
    bannerUrl: "https://lh3.googleusercontent.com/aida/AP1WRLvjwDgklPmuZVpHmBNKrFMOe0YcxqMcTW3rJLI8AOZ391aWD_lSLzmg1aSerhFhNPdJxRGdpHkzXMRE9f2u6eqfLHXF8BTXZLZ2nLIZ-NSID01d9YZiA6OkWGXIJiosDSlA9QsrQTCjUJhFvEhTcp4AbSd2XC_6Y_DCo37h0DkWoDyEckCBh-8b-N1pylGgriCvbrIXsAFU4u1-Tr6ZHbGDTl34BtgpV13mys7HCscUUYIUxc-pmTuzxGxC",
    releaseYear: 2013,
    durationMinutes: "47 phút/tập",
    type: "series",
    status: "completed",
    episodeCurrent: "62",
    episodeTotal: "62",
    quality: "FHD",
    lang: "Vietsub",
    imdbScore: 9.5,
    views: 12000,
    commentCount: 850,
    category: "Âu Mỹ",
    ageRating: "T18",
    genres: ["Hình Sự", "Kịch Tính", "Tội Phạm"],
    seasons: "Phần 5"
  },
  {
    id: "m12",
    title: "Bằng Chứng Thép",
    originalTitle: "Forensic Heroes",
    slug: "bang-chung-thep",
    description: "Tác phẩm hình sự TVB kinh điển về sự phối hợp nhịp nhàng giữa tổ trọng án, pháp y và pháp chứng để vạch trần tội ác.",
    posterUrl: "https://lh3.googleusercontent.com/aida/AP1WRLt1gw1NAa9--TgtxDr6MhqsVB6sFg1irwNVWwIPu22poK0pfrnPqOog32qfkmPyXdcp5G0NcesfQ1YDDJmWUOS5yQBN5Szfx2TttGEiInE65MW9-hiVlfYBMev45vhAzXfjvs3xIxkksQXqfx_sWB4RqrStJSYU6r8XTRSck5mpN3vHkVcrkDYjlRbCB5p_A70QDRIiVMIDJaBf9F4r7vnaudXMxq8QoKbk0y8RVU2H77Hci2fkGH0rRWs",
    bannerUrl: "https://lh3.googleusercontent.com/aida/AP1WRLt1gw1NAa9--TgtxDr6MhqsVB6sFg1irwNVWwIPu22poK0pfrnPqOog32qfkmPyXdcp5G0NcesfQ1YDDJmWUOS5yQBN5Szfx2TttGEiInE65MW9-hiVlfYBMev45vhAzXfjvs3xIxkksQXqfx_sWB4RqrStJSYU6r8XTRSck5mpN3vHkVcrkDYjlRbCB5p_A70QDRIiVMIDJaBf9F4r7vnaudXMxq8QoKbk0y8RVU2H77Hci2fkGH0rRWs",
    releaseYear: 2006,
    durationMinutes: "45 phút/tập",
    type: "series",
    status: "completed",
    episodeCurrent: "25",
    episodeTotal: "25",
    quality: "HD",
    lang: "Lồng Tiếng",
    imdbScore: 9.0,
    views: 3200,
    commentCount: 100,
    category: "TVB",
    ageRating: "T16",
    genres: ["Hình Sự", "Trinh Thám", "Pháp Y"],
    seasons: "Phần 1"
  },
  {
    id: "m13",
    title: "Trúc Ngạn",
    originalTitle: "The Bamboo Shore",
    slug: "truc-ngan",
    description: "Bộ phim cổ trang cung đấu kỳ bí với những âm mưu gia tộc nghẹt thở và kịch tính.",
    posterUrl: "https://lh3.googleusercontent.com/aida/AP1WRLs0cwmsQtUMxz8S1kYIBe2vdzk9wlKrAYAA0SaImKjlJwYFoNlbX5Ezes6Vk4D5W-ucCQ2T9RmBKbr_ZMBabRA9Ttc6dmERubqhLsdx1wunz3brbgXi5rroXOR2ruzik_0pwCF5YxH6Uvl1XXNB5hThMgn1BnmAaijvACGEDvmqkuTyiOamRT4EaIM9cR5bB6VIsLFANxSFbHoSZwiBE2ropgLTIEGcBH_t4b9HchPMwtxA3L-vMixjNaq2",
    bannerUrl: "https://lh3.googleusercontent.com/aida/AP1WRLs0cwmsQtUMxz8S1kYIBe2vdzk9wlKrAYAA0SaImKjlJwYFoNlbX5Ezes6Vk4D5W-ucCQ2T9RmBKbr_ZMBabRA9Ttc6dmERubqhLsdx1wunz3brbgXi5rroXOR2ruzik_0pwCF5YxH6Uvl1XXNB5hThMgn1BnmAaijvACGEDvmqkuTyiOamRT4EaIM9cR5bB6VIsLFANxSFbHoSZwiBE2ropgLTIEGcBH_t4b9HchPMwtxA3L-vMixjNaq2",
    releaseYear: 2024,
    durationMinutes: "45 phút/tập",
    type: "series",
    status: "ongoing",
    episodeCurrent: "15",
    episodeTotal: "30",
    quality: "FHD",
    lang: "Vietsub",
    imdbScore: 8.7,
    views: 2100,
    commentCount: 50,
    category: "Trung Quốc",
    ageRating: "T13",
    genres: ["Cổ Trang", "Kịch Tính", "Gia Đấu"],
    seasons: "Phần 1"
  },
  {
    id: "m14",
    title: "ONE PIECE",
    originalTitle: "Đảo Hải Tặc",
    slug: "one-piece",
    description: "Bộ anime phiêu lưu huyền thoại kể về cuộc hành trình tìm kiếm kho báu huyền thoại của Luffy và băng hải tặc Mũ Rơm.",
    posterUrl: "https://lh3.googleusercontent.com/aida/AP1WRLskEpjrTbHRx6Jj3TAoagePHNQcXAyfE57exarNW0uRrctCdcc2Ns3Gccg-Q-sHR-iGafdXbWGBY3VqNGMMuNWRowyO8JZHlFLslh1G5WNrcjJ3y-OsTKgIzQGIYkOO5N88CKrVCPSenE4g8yUwk_MMtWZukOp8Pey1U0z24BjmBKodM448SynZ3QPSKC1mnooHd98SJMI_XxGvi66yl7YdJWaJyz_WDpl2GVANjq5HCB5SoVUfM8sY3Auj",
    bannerUrl: "https://lh3.googleusercontent.com/aida/AP1WRLskEpjrTbHRx6Jj3TAoagePHNQcXAyfE57exarNW0uRrctCdcc2Ns3Gccg-Q-sHR-iGafdXbWGBY3VqNGMMuNWRowyO8JZHlFLslh1G5WNrcjJ3y-OsTKgIzQGIYkOO5N88CKrVCPSenE4g8yUwk_MMtWZukOp8Pey1U0z24BjmBKodM448SynZ3QPSKC1mnooHd98SJMI_XxGvi66yl7YdJWaJyz_WDpl2GVANjq5HCB5SoVUfM8sY3Auj",
    releaseYear: 1999,
    durationMinutes: "24 phút/tập",
    type: "series",
    status: "ongoing",
    episodeCurrent: "1115",
    episodeTotal: "1200",
    quality: "FHD",
    lang: "Vietsub",
    imdbScore: 9.0,
    views: 9100,
    commentCount: 450,
    category: "Hoạt Hình",
    ageRating: "T13",
    genres: ["Hoạt Hình", "Hành Động", "Phiêu Lưu"],
    seasons: "Wano Quốc"
  }
];

export function mergeStoredEpisodesConfig(movieSlug: string, episodes: any[]): any[] {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return episodes.map((server: any) => {
      const srvData = Array.isArray(server.serverData || server.server_data) ? (server.serverData || server.server_data) : [];
      return {
        serverName: server.serverName || server.server_name || "Server VIP",
        serverData: srvData.map((ep: any) => ({
          name: ep.name || '',
          slug: ep.slug || `tap-${ep.name}`,
          filename: ep.filename || '',
          linkEmbed: ep.linkEmbed || ep.link_embed || '',
          linkM3u8: ep.linkM3u8 || ep.link_m3u8 || '',
          subtitles: ep.subtitles || ep.subtitles_data || [],
          timeIntroStart: ep.timeIntroStart || ep.time_intro_start || 0,
          timeIntroEnd: ep.timeIntroEnd || ep.time_intro_end || 0,
          timeOutroStart: ep.timeOutroStart || ep.time_outro_start || 0,
          timeOutroEnd: ep.timeOutroEnd || ep.time_outro_end || 0,
          airDate: ep.airDate || ep.air_date || '',
          airTime: ep.airTime || ep.air_time || ''
        }))
      };
    });
  }
  
  try {
    const storedConfig = localStorage.getItem('txa_episodes_config');
    const movieConfig = storedConfig ? JSON.parse(storedConfig)[movieSlug] : null;

    return episodes.map((server: any) => {
      const srvData = Array.isArray(server.serverData || server.server_data) ? (server.serverData || server.server_data) : [];
      return {
        serverName: server.serverName || server.server_name || "Server VIP",
        serverData: srvData.map((ep: any) => {
          const epSlug = ep.slug;
          const epConfig = movieConfig ? movieConfig[epSlug] : null;
          
          if (epConfig) {
            return {
              name: ep.name || '',
              slug: ep.slug || `tap-${ep.name}`,
              filename: ep.filename || '',
              linkEmbed: ep.linkEmbed || ep.link_embed || '',
              linkM3u8: ep.linkM3u8 || ep.link_m3u8 || '',
              subtitles: epConfig.subtitles || ep.subtitles || ep.subtitles_data || [],
              timeIntroStart: epConfig.timeIntroStart !== undefined ? epConfig.timeIntroStart : (ep.timeIntroStart || ep.time_intro_start || 0),
              timeIntroEnd: epConfig.timeIntroEnd !== undefined ? epConfig.timeIntroEnd : (ep.timeIntroEnd || ep.time_intro_end || 0),
              timeOutroStart: epConfig.timeOutroStart !== undefined ? epConfig.timeOutroStart : (ep.timeOutroStart || ep.time_outro_start || 0),
              timeOutroEnd: epConfig.timeOutroEnd !== undefined ? epConfig.timeOutroEnd : (ep.timeOutroEnd || ep.time_outro_end || 0),
              airDate: epConfig.airDate !== undefined ? epConfig.airDate : (ep.airDate || ep.air_date || ''),
              airTime: epConfig.airTime !== undefined ? epConfig.airTime : (ep.airTime || ep.air_time || '')
            };
          }
          return {
            name: ep.name || '',
            slug: ep.slug || `tap-${ep.name}`,
            filename: ep.filename || '',
            linkEmbed: ep.linkEmbed || ep.link_embed || '',
            linkM3u8: ep.linkM3u8 || ep.link_m3u8 || '',
            subtitles: ep.subtitles || ep.subtitles_data || [],
            timeIntroStart: ep.timeIntroStart || ep.time_intro_start || 0,
            timeIntroEnd: ep.timeIntroEnd || ep.time_intro_end || 0,
            timeOutroStart: ep.timeOutroStart || ep.time_outro_start || 0,
            timeOutroEnd: ep.timeOutroEnd || ep.time_outro_end || 0,
            airDate: ep.airDate || ep.air_date || '',
            airTime: ep.airTime || ep.air_time || ''
          };
        })
      };
    });
  } catch (e) {
    console.error('Error merging episodes config:', e);
  }

  return episodes.map((server: any) => {
    const srvData = Array.isArray(server.serverData || server.server_data) ? (server.serverData || server.server_data) : [];
    return {
      serverName: server.serverName || server.server_name || "Server VIP",
      serverData: srvData.map((ep: any) => ({
        name: ep.name || '',
        slug: ep.slug || `tap-${ep.name}`,
        filename: ep.filename || '',
        linkEmbed: ep.linkEmbed || ep.link_embed || '',
        linkM3u8: ep.linkM3u8 || ep.link_m3u8 || '',
        subtitles: ep.subtitles || ep.subtitles_data || [],
        timeIntroStart: ep.timeIntroStart || ep.time_intro_start || 0,
        timeIntroEnd: ep.timeIntroEnd || ep.time_intro_end || 0,
        timeOutroStart: ep.timeOutroStart || ep.time_outro_start || 0,
        timeOutroEnd: ep.timeOutroEnd || ep.time_outro_end || 0,
        airDate: ep.airDate || ep.air_date || '',
        airTime: ep.airTime || ep.air_time || ''
      }))
    };
  });
}

export function mapKKPhimToMovieDetail(data: any): MovieDetail {
  const m = data.movie;
  const cdnDomain = data.pathImage || data.APP_DOMAIN_CDN_IMAGE || "https://phimimg.com";
  
  let posterUrl = m.poster_url || '';
  if (posterUrl && !posterUrl.startsWith('http')) {
    posterUrl = `${cdnDomain}/${posterUrl.replace(/^\//, '')}`;
  }
  let bannerUrl = m.thumb_url || m.poster_url || '';
  if (bannerUrl && !bannerUrl.startsWith('http')) {
    bannerUrl = `${cdnDomain}/${bannerUrl.replace(/^\//, '')}`;
  }

  const genres = Array.isArray(m.category) ? m.category.map((c: any) => c.name) : [];
  
  let category = "Khác";
  if (Array.isArray(m.category) && m.category.length > 0) {
    category = m.category[0].name;
  }
  let country = "Khác";
  if (Array.isArray(m.country) && m.country.length > 0) {
    country = m.country[0].name;
  }

  let type: 'movie' | 'series' | 'hoathinh' | 'tvshows' = 'series';
  if (m.type === 'single') {
    type = 'movie';
  } else if (m.type === 'hoathinh') {
    type = 'hoathinh';
  } else if (m.type === 'tvshows') {
    type = 'tvshows';
  }

  const episodes = Array.isArray(data.episodes) ? data.episodes.map((server: any) => {
    return {
      serverName: server.server_name || "Server VIP",
      serverData: Array.isArray(server.server_data) ? server.server_data.map((ep: any) => {
        let epName = ep.name || '';
        if (epName.trim().match(/^\d+$/)) {
          epName = `Tập ${epName.padStart(2, '0')}`;
        }
        const rawSubs = ep.subtitles || ep.subtitles_data || [];
        const fallbackSubs = (rawSubs && rawSubs.length > 0) ? rawSubs : [];
        return {
          name: epName,
          slug: ep.slug || `tap-${ep.name}`,
          filename: ep.filename || `${m.name} - Tap ${ep.name}`,
          linkEmbed: ep.link_embed || '',
          linkM3u8: ep.link_m3u8 || '',
          subtitles: fallbackSubs,
          timeIntroStart: ep.timeIntroStart || ep.time_intro_start || 0,
          timeIntroEnd: ep.timeIntroEnd || ep.time_intro_end || 0,
          timeOutroStart: ep.timeOutroStart || ep.time_outro_start || 0,
          timeOutroEnd: ep.timeOutroEnd || ep.time_outro_end || 0,
          airDate: ep.airDate || ep.air_date || '',
          airTime: ep.airTime || ep.air_time || ''
        };
      }) : []
    };
  }) : [];

  return {
    id: m._id || m.id || `kk-${m.slug}`,
    title: m.name,
    originalTitle: m.origin_name,
    slug: m.slug,
    description: m.content ? m.content.replace(/<[^>]*>/g, '') : '',
    posterUrl: posterUrl,
    bannerUrl: bannerUrl,
    releaseYear: parseInt(m.year) || 2024,
    durationMinutes: m.time || (type === 'movie' ? '120 phút' : '45 phút/tập'),
    type: type,
    status: m.status === 'completed' ? 'completed' : 'ongoing',
    episodeCurrent: m.episode_current || (type === 'movie' ? 'Full' : '1'),
    episodeTotal: m.episode_total || '1',
    quality: m.quality || 'FHD',
    lang: m.lang || 'Vietsub',
    imdbScore: 8.0,
    views: Math.floor(Math.random() * 5000) + 100,
    commentCount: Math.floor(Math.random() * 200) + 10,
    category: category,
    country: country,
    ageRating: type === 'movie' ? 'T16' : 'T13',
    genres: genres,
    seasons: type === 'movie' ? 'Bản Điện Ảnh' : 'Phần 1',
    actors: Array.isArray(m.actor) ? m.actor.filter(Boolean) : [],
    directors: Array.isArray(m.director) ? m.director.filter(Boolean) : [],
    trailerUrl: m.trailer_url || '',
    episodes: mergeStoredEpisodesConfig(m.slug, episodes)
  };
}

export function mapKKPhimSearchItemToMovie(item: any, cdnDomain: string = "https://phimimg.com"): Movie {
  let posterUrl = item.poster_url || '';
  if (posterUrl && !posterUrl.startsWith('http')) {
    posterUrl = `${cdnDomain}/${posterUrl.replace(/^\//, '')}`;
  }
  let bannerUrl = item.thumb_url || item.poster_url || '';
  if (bannerUrl && !bannerUrl.startsWith('http')) {
    bannerUrl = `${cdnDomain}/${bannerUrl.replace(/^\//, '')}`;
  }

  let type: 'movie' | 'series' | 'hoathinh' | 'tvshows' = 'series';
  if (item.type === 'single') {
    type = 'movie';
  } else if (item.type === 'hoathinh') {
    type = 'hoathinh';
  } else if (item.type === 'tvshows') {
    type = 'tvshows';
  }

  let category = "Khác";
  if (Array.isArray(item.category) && item.category.length > 0) {
    category = item.category[0].name;
  } else if (typeof item.category === 'string') {
    category = item.category;
  }

  let country = "Khác";
  if (Array.isArray(item.country) && item.country.length > 0) {
    country = item.country[0].name;
  } else if (typeof item.country === 'string') {
    country = item.country;
  }

  return {
    id: item._id || item.id || `kk-${item.slug}`,
    title: item.name,
    originalTitle: item.origin_name,
    slug: item.slug,
    description: "",
    posterUrl: posterUrl,
    bannerUrl: bannerUrl,
    releaseYear: parseInt(item.year) || 2024,
    durationMinutes: type === 'movie' ? '120 phút' : '45 phút/tập',
    type: type,
    status: 'ongoing',
    episodeCurrent: 'Tập mới',
    episodeTotal: '1',
    quality: 'FHD',
    lang: 'Vietsub',
    imdbScore: 8.0,
    views: Math.floor(Math.random() * 5000) + 100,
    commentCount: Math.floor(Math.random() * 200) + 10,
    category: category,
    country: country,
    genres: []
  };
}

export class LocalMovieProvider implements IMovieProvider {
  private getLocalMovies(): Movie[] {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('txa_crawled_movies');
        if (stored) {
          const list = JSON.parse(stored);
          if (Array.isArray(list)) {
            return list.map((m: any) => {
              const movieData = m.movie || m;
              let type: 'movie' | 'series' | 'hoathinh' | 'tvshows' = 'series';
              if (movieData.type === 'single' || movieData.type === 'movie') {
                type = 'movie';
              } else if (movieData.type === 'hoathinh') {
                type = 'hoathinh';
              } else if (movieData.type === 'tvshows') {
                type = 'tvshows';
              }
              return {
                id: movieData.id || `local-${movieData.slug}`,
                title: movieData.title || movieData.name,
                originalTitle: movieData.originalTitle || movieData.origin_name,
                slug: movieData.slug,
                description: movieData.description || movieData.content || '',
                posterUrl: movieData.posterUrl || movieData.poster_url,
                bannerUrl: movieData.bannerUrl || movieData.thumb_url || movieData.posterUrl,
                releaseYear: movieData.releaseYear || parseInt(movieData.year) || 2024,
                durationMinutes: movieData.durationMinutes || movieData.time || '120 phút',
                type: type,
                status: movieData.status === 'completed' ? 'completed' : 'ongoing',
                episodeCurrent: movieData.episodeCurrent || movieData.episode_current || 'Full',
                episodeTotal: movieData.episodeTotal || movieData.episode_total || '1',
                quality: movieData.quality || 'FHD',
                lang: movieData.lang || 'Vietsub',
                imdbScore: movieData.imdbScore || 8.0,
                views: movieData.views || Math.floor(Math.random() * 5000) + 100,
                commentCount: movieData.commentCount || Math.floor(Math.random() * 200) + 10,
                category: movieData.category || 'Khác',
                genres: movieData.genres || [],
                updatedAt: movieData.updatedAt || new Date().toISOString()
              };
            });
          }
        } else {
          return [];
        }
      } catch (e) {
        console.error('Error loading local movies:', e);
      }
    }
    
    // Server-side fallback or error fallback
    return [];
  }

  private getLocalMovieDetail(slug: string): MovieDetail | null {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('txa_crawled_movies');
        if (stored) {
          const list = JSON.parse(stored);
          if (Array.isArray(list)) {
            const found = list.find((m: any) => {
              const movieData = m.movie || m;
              return movieData.slug === slug;
            });
            if (found) {
              const movieData = found.movie || found;
              let type: 'movie' | 'series' | 'hoathinh' | 'tvshows' = 'series';
              if (movieData.type === 'single' || movieData.type === 'movie') {
                type = 'movie';
              } else if (movieData.type === 'hoathinh') {
                type = 'hoathinh';
              } else if (movieData.type === 'tvshows') {
                type = 'tvshows';
              }

              const episodes = Array.isArray(found.episodes) ? found.episodes : [];

              return {
                id: movieData.id || `local-${movieData.slug}`,
                title: movieData.title || movieData.name,
                originalTitle: movieData.originalTitle || movieData.origin_name,
                slug: movieData.slug,
                description: movieData.description || movieData.content || '',
                posterUrl: movieData.posterUrl || movieData.poster_url,
                bannerUrl: movieData.bannerUrl || movieData.thumb_url || movieData.posterUrl,
                releaseYear: movieData.releaseYear || parseInt(movieData.year) || 2024,
                durationMinutes: movieData.durationMinutes || movieData.time || '120 phút',
                type: type,
                status: movieData.status === 'completed' ? 'completed' : 'ongoing',
                episodeCurrent: movieData.episodeCurrent || movieData.episode_current || 'Full',
                episodeTotal: movieData.episodeTotal || movieData.episode_total || '1',
                quality: movieData.quality || 'FHD',
                lang: movieData.lang || 'Vietsub',
                imdbScore: movieData.imdbScore || 8.0,
                views: movieData.views || Math.floor(Math.random() * 5000) + 100,
                commentCount: movieData.commentCount || Math.floor(Math.random() * 200) + 10,
                category: movieData.category || 'Khác',
                genres: movieData.genres || [],
                seasons: movieData.seasons || (type === 'movie' ? 'Bản Điện Ảnh' : 'Phần 1'),
                actors: movieData.actors || (Array.isArray(movieData.actor) ? movieData.actor.filter(Boolean) : []),
                directors: movieData.directors || (Array.isArray(movieData.director) ? movieData.director.filter(Boolean) : []),
                trailerUrl: movieData.trailerUrl || movieData.trailer_url || '',
                episodes: mergeStoredEpisodesConfig(movieData.slug, episodes)
              };
            }
          }
        }
      } catch (e) {
        console.error('Error loading local movie detail:', e);
      }
    }
    return null;
  }

  async getMovies(params?: { type?: 'movie' | 'series' | 'hoathinh' | 'tvshows', category?: string, limit?: number, sortBy?: string, slugs?: string[] }): Promise<Movie[]> {
    const local = this.getLocalMovies();
    const localSlugs = new Set(local.map(m => m.slug));
    const combined = [
      ...local,
      ...seedMovies.filter(m => !localSlugs.has(m.slug))
    ];
    let result = combined;

    if (params?.slugs && Array.isArray(params.slugs)) {
      const slugSet = new Set(params.slugs);
      result = result.filter(m => slugSet.has(m.slug));
    }

    if (params?.type) {
      result = result.filter(m => m.type === params.type);
    }
    
    if (params?.category) {
      const category = params.category;
      if (category === 'Lồng Tiếng' || category === 'long-tieng') {
        result = result.filter(m => m.lang === 'Lồng Tiếng' || m.lang === 'Thuyết Minh');
      } else if (category === 'Châu Tinh Trì' || category === 'chau-tinh-tri' || category === 'chau-tinh-tri-xem-la-cuoi') {
        result = result.filter(m => 
          (Array.isArray(m.actors) && m.actors.some((a: any) => (typeof a === 'string' ? a : a?.name || '').toLowerCase().includes('châu tinh trì'))) ||
          (m.title && m.title.toLowerCase().includes('châu tinh trì'))
        );
      } else if (category === 'toi-so-con-nguoi-em-roi-do') {
        result = result.filter(m => 
          Array.isArray(m.genres) && m.genres.some((g: string) => {
            const lower = (g || '').toLowerCase();
            return lower.includes('kinh dị') || lower.includes('ma') || lower.includes('thriller') || lower.includes('horror');
          })
        );
      } else if (category === 'phim-thai-new') {
        result = result.filter(m => 
          m.category === 'Thái Lan' || (Array.isArray(m.genres) && m.genres.some((g: string) => (g || '').toLowerCase().includes('thái')))
        );
      } else {
        result = result.filter(m => 
          m.category === category || 
          m.country === category || 
          (Array.isArray(m.genres) && m.genres.includes(category))
        );
      }
    }

    if (params?.sortBy === 'imdb_score') {
      result.sort((a, b) => (b.imdbScore || 0) - (a.imdbScore || 0));
    } else if (params?.sortBy === 'views_comments') {
      result.sort((a, b) => ((b.views || 0) + (b.commentCount || 0)) - ((a.views || 0) + (a.commentCount || 0)));
    } else if (params?.sortBy === 'updatedAt' || !params?.sortBy) {
      result.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    }

    if (params?.limit) {
      result = result.slice(0, params.limit);
    }
    
    return result;
  }

  async getMovieBySlug(slug: string): Promise<MovieDetail | null> {
    // 1. Check local storage first
    const local = this.getLocalMovieDetail(slug);
    if (local) return local;

    // 2. Check seedMovies
    const movie = seedMovies.find(m => m.slug === slug);
    if (movie) {
      const totalEps = parseInt(movie.episodeTotal) || 1;
      const episodesData = [];
      for (let i = 1; i <= totalEps; i++) {
        episodesData.push({
          name: `Tập ${i}`,
          slug: `tap-${i}`,
          filename: `Tap ${i}.mp4`,
          linkEmbed: "https://www.youtube.com/embed/dQw4w9WgXcQ",
          linkM3u8: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
          subtitles: [
            {
              label: "Tiếng Việt",
              file: "https://stream.dongmephim.online/subs/ep1135_vi.vtt"
            },
            {
              label: "English",
              file: "https://stream.dongmephim.online/subs/ep1135_en.vtt"
            }
          ],
          timeIntroStart: 5,
          timeIntroEnd: 15,
          timeOutroStart: 25,
          timeOutroEnd: 32
        });
      }
      const rawEpisodes = [
        {
          serverName: "DongMePhim VIP",
          serverData: episodesData
        },
        {
          serverName: "FPT Fast",
          serverData: episodesData
        }
      ];
      
      let type: 'movie' | 'series' | 'hoathinh' | 'tvshows' = 'series';
      if (movie.type === 'movie') type = 'movie';
      
      return {
        ...movie,
        type,
        actors: [],
        directors: [],
        trailerUrl: '',
        episodes: mergeStoredEpisodesConfig(movie.slug, rawEpisodes)
      };
    }

    // 3. Fallback: Fetch directly from KKPhim API (supports crawled movies dynamically in SSR)
    try {
      const res = await fetch(`https://phimapi.com/phim/${slug}`);
      if (res.ok) {
        const data = await res.json() as any;
        if (data && data.status && data.movie) {
          const detail = mapKKPhimToMovieDetail(data);
          
          if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
            try {
              const storedConfig = localStorage.getItem('txa_episodes_config');
              if (storedConfig) {
                const config = JSON.parse(storedConfig);
                if (config[slug] && config[slug].broadcastSchedule) {
                  detail.broadcastSchedule = config[slug].broadcastSchedule;
                }
              }
            } catch (e) {
              console.error('Error merging broadcastSchedule for API movie:', e);
            }
          }
          
          return detail;
        }
      }
    } catch (e) {
      console.warn(`Cannot fetch movie detail from KKPhim API for slug: ${slug}`, e);
    }

    return null;
  }

  async getRelatedMovies(movieId: string): Promise<Movie[]> {
    const combined = this.getLocalMovies();
    return combined.filter(m => m.id !== movieId).slice(0, 4);
  }

  async searchMovies(query: string): Promise<Movie[]> {
    const lowerQuery = query.toLowerCase();
    const combined = this.getLocalMovies();
    
    const localResults = combined.filter(m => 
      m.title.toLowerCase().includes(lowerQuery) || 
      (m.originalTitle && m.originalTitle.toLowerCase().includes(lowerQuery)) ||
      m.description.toLowerCase().includes(lowerQuery)
    );

    if (localResults.length > 0) {
      return localResults;
    }

    try {
      const res = await fetch(`https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(query)}&limit=10`);
      if (res.ok) {
        const data = await res.json() as any;
        if (data && data.status === "success" && data.data && Array.isArray(data.data.items)) {
          const cdnDomain = data.data.APP_DOMAIN_CDN_IMAGE || "https://phimimg.com";
          return data.data.items.map((item: any) => mapKKPhimSearchItemToMovie(item, cdnDomain));
        }
      }
    } catch (e) {
      console.warn(`Error searching movies from KKPhim API for query: ${query}`, e);
    }

    return [];
  }
}
