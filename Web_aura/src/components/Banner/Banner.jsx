import { ArrowDownRight } from 'lucide-react'
import './Banner.css'

export default function Banner() {
  return (
    <section
      className="banner khung-noi-dung"
      id="trang-chu"
      aria-labelledby="tieu-de-banner"
    >
      <div className="noi-dung-banner">
        <p className="nhan-nho">Lookbook AURA · 2026</p>

        <h1 id="tieu-de-banner">
          Bản sắc tối giản &amp; nghệ thuật cá nhân hóa
        </h1>

        <p className="mo-ta-banner">
          Những thiết kế vượt thời gian dành cho người yêu sự tự do,
          tinh tế và muốn kể câu chuyện riêng qua từng chi tiết.
        </p>

        <div className="nhom-nut-banner">
          <a className="nut-chinh nut-nen-den" href="#san-pham">
            Khám phá bộ sưu tập
          </a>

          <a className="nut-chinh" href="#ca-nhan-hoa">
            Tạo dấu ấn riêng
          </a>
        </div>
      </div>

      <figure className="anh-banner anh-banner-lon">
        <img
          src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1100&q=90"
          alt="Bộ sưu tập thời trang AURA"
        />
        <figcaption>AURA / Essentials</figcaption>
      </figure>

      <figure className="anh-banner anh-banner-nho">
        <img
          src="https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=800&q=90"
          alt="Chi tiết thời trang tối giản"
        />
        <span className="mui-ten-banner">
          <ArrowDownRight />
        </span>
      </figure>
    </section>
  )
}