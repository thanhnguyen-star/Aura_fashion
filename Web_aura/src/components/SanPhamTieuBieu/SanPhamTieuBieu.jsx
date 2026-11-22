import { Plus } from 'lucide-react'
import { danhSachSanPham } from '../../data/duLieu.js'
import './SanPhamTieuBieu.css'

const dinhDangGia = (gia) => {
  return `${gia.toLocaleString('vi-VN')}đ`
}

export default function SanPhamTieuBieu({ themVaoGio }) {
  return (
    <section
      className="san-pham-tieu-bieu phan-noi-dung"
      id="san-pham"
      aria-labelledby="tieu-de-san-pham"
    >
      <div className="khung-noi-dung">
        <div className="tieu-de-phan">
          <div>
            <p className="nhan-nho">AURA Selects</p>
            <h2 id="tieu-de-san-pham">Sản phẩm tiêu biểu</h2>
          </div>

          <a href="#san-pham">Xem tất cả →</a>
        </div>

        <div className="luoi-san-pham">
          {danhSachSanPham.map((sanPham) => (
            <article className="the-san-pham" key={sanPham.id}>
              <div className="khung-anh-san-pham">
                <img src={sanPham.anh} alt={sanPham.ten} />

                <span className="nhan-san-pham">{sanPham.nhan}</span>

                <button
                  className="nut-them-gio"
                  type="button"
                  onClick={() => themVaoGio(sanPham)}
                >
                  <Plus />
                  Thêm vào giỏ
                </button>
              </div>

              <h3>{sanPham.ten}</h3>
              <p>{dinhDangGia(sanPham.gia)}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}