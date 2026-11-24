import { Trash2, X, Sparkles } from 'lucide-react'
import './GioHangMini.css'

const dinhDangGia = (gia) => {
  return `${(gia || 0).toLocaleString('vi-VN')}đ`
}

export default function GioHangMini({
  danhSach,
  dangMo,
  dongGioHang,
  xoaKhoiGio,
  onOpenCheckout,
}) {
  const tongTien = danhSach.reduce(
    (tong, item) => tong + (item.gia || 0) * (item.soLuong || 1),
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
                <img src={item.anh || '/img/sp1.png'} alt={item.ten} />

                <div>
                  <h3>{item.ten}</h3>
                  {(item.size || item.color) && (
                    <div style={{ fontSize: '11px', color: '#71717a', margin: '2px 0' }}>
                      {item.size && `Size: ${item.size}`} {item.color && `· Màu: ${item.color}`}
                    </div>
                  )}
                  {item.hasPrint && item.printTemplate && (
                    <div
                      style={{
                        fontSize: '10.5px',
                        color: '#09090b',
                        background: '#f4f4f5',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        width: 'fit-content',
                        margin: '2px 0 4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      <Sparkles size={10} color="#10b981" />
                      In: {item.printTemplate} ({item.printLocation || 'Trước ngực'})
                    </div>
                  )}
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

          <button
            type="button"
            disabled={danhSach.length === 0}
            onClick={() => {
              dongGioHang()
              onOpenCheckout?.()
            }}
          >
            Thanh toán ngay
          </button>
        </div>
      </aside>
    </>
  )
}
