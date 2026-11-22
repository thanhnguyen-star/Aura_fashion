import { ArrowUpRight } from 'lucide-react'
import { danhSachDanhMuc } from '../../data/duLieu.js'
import './DanhMuc.css'

export default function DanhMuc() {
  return (
    <section
      className="phan-noi-dung khung-noi-dung"
      id="danh-muc"
      aria-labelledby="tieu-de-danh-muc"
    >
      <div className="tieu-de-phan">
        <div>
          <p className="nhan-nho">Khám phá AURA</p>
          <h2 id="tieu-de-danh-muc">Mua sắm theo danh mục</h2>
        </div>

        <a href="#san-pham">Xem sản phẩm →</a>
      </div>

      <div className="luoi-danh-muc">
        {danhSachDanhMuc.map((danhMuc, viTri) => (
          <a
            className="the-danh-muc"
            href="#san-pham"
            key={danhMuc.id}
            style={{ '--do-tre': `${viTri * 120}ms` }}
          >
            <div className="khung-anh-danh-muc">
              <img src={danhMuc.anh} alt={danhMuc.ten} />
            </div>

            <h3>
              {danhMuc.ten}
              <ArrowUpRight />
            </h3>

            <p>{danhMuc.moTa}</p>
          </a>
        ))}
      </div>
    </section>
  )
}