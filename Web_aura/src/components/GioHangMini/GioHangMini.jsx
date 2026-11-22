import { Trash2, X } from 'lucide-react'
import './GioHangMini.css'

const dinhDangGia = (gia) => {
  return `${gia.toLocaleString('vi-VN')}đ`
}

export default function GioHangMini({
  danhSach,
  dangMo,
  dongGioHang,
  xoaKhoiGio,
}) {
  const tongTien = danhSach.reduce(
    (tong, item) => tong + item.gia * item.soLuong,
    0,
  )

  return (
    <>
      <button
        className={`lop-phu-gio-hang ${dangMo ? 'dang-hien' : ''}`}
        type="button"
        onClick={dongGioHang}
        aria-label="Đóng giỏ hàng"
      />

      <aside
        className={`gio-hang-mini ${dangMo ? 'dang-mo' : ''}`}
        aria-hidden={!dangMo}
      >
        <div className="tieu-de-gio-hang">
          <h2>Giỏ hàng ({danhSach.length})</h2>

          <button
            type="button"
            onClick={dongGioHang}
            aria-label="Đóng giỏ hàng"
          >
            <X />
          </button>
        </div>

        <div className="danh-sach-trong-gio">
          {danhSach.length === 0 ? (
            <p className="thong-bao-gio-trong">
              Giỏ hàng của bạn đang trống.
            </p>
          ) : (
            danhSach.map((item) => (
              <article className="san-pham-trong-gio" key={item.id}>
                <img src={item.anh} alt={item.ten} />

                <div>
                  <h3>{item.ten}</h3>
                  <p>Số lượng: {item.soLuong}</p>
                  <strong>
                    {dinhDangGia(item.gia * item.soLuong)}
                  </strong>
                </div>

                <button
                  type="button"
                  onClick={() => xoaKhoiGio(item.id)}
                  aria-label={`Xóa ${item.ten}`}
                >
                  <Trash2 />
                </button>
              </article>
            ))
          )}
        </div>

        <div className="tong-gio-hang">
          <p>
            <span>Tạm tính</span>
            <strong>{dinhDangGia(tongTien)}</strong>
          </p>

          <button type="button">Thanh toán</button>
        </div>
      </aside>
    </>
  )
}