import {
  RefreshCw,
  ShieldCheck,
  Truck,
} from 'lucide-react'
import './ChinhSach.css'

const danhSachChinhSach = [
  {
    id: 1,
    tieuDe: 'Giao hàng toàn quốc',
    moTa: 'Miễn phí cho đơn hàng từ 999.000đ.',
    BieuTuong: Truck,
  },
  {
    id: 2,
    tieuDe: 'Đổi trả dễ dàng',
    moTa: 'Hỗ trợ đổi sản phẩm trong vòng 7 ngày.',
    BieuTuong: RefreshCw,
  },
  {
    id: 3,
    tieuDe: 'Thanh toán an toàn',
    moTa: 'Hỗ trợ COD và chuyển khoản ngân hàng.',
    BieuTuong: ShieldCheck,
  },
]

export default function ChinhSach() {
  return (
    <section
      className="chinh-sach khung-noi-dung"
      aria-label="Chính sách mua hàng"
    >
      {danhSachChinhSach.map(
        ({ id, tieuDe, moTa, BieuTuong }) => (
          <article key={id}>
            <BieuTuong />

            <div>
              <h3>{tieuDe}</h3>
              <p>{moTa}</p>
            </div>
          </article>
        ),
      )}
    </section>
  )
}