import { ArrowRight } from 'lucide-react'
import './CaNhanHoa.css'

const cacBuoc = [
  'Chọn sản phẩm',
  'Chọn mẫu thiết kế',
  'Xác nhận và đặt hàng',
]

export default function CaNhanHoa() {
  return (
    <section className="ca-nhan-hoa" id="ca-nhan-hoa">
      <div className="anh-ca-nhan-hoa">
        <img
          src="https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1300&q=90"
          alt="Áo thun cá nhân hóa AURA"
        />
      </div>

      <div className="noi-dung-ca-nhan-hoa">
        <p className="nhan-nho">Made for you</p>

        <h2>Thiết kế dấu ấn của riêng bạn</h2>

        <p className="mo-ta-ca-nhan-hoa">
          Chọn sản phẩm, màu sắc và mẫu in. AURA sẽ hoàn thiện một
          phiên bản mang tinh thần riêng của bạn.
        </p>

        <ol className="cac-buoc">
          {cacBuoc.map((buoc, viTri) => (
            <li key={buoc}>
              <span>0{viTri + 1}</span>
              {buoc}
            </li>
          ))}
        </ol>

        <a className="nut-ca-nhan-hoa" href="#san-pham">
          Bắt đầu thiết kế
          <ArrowRight />
        </a>
      </div>
    </section>
  )
}