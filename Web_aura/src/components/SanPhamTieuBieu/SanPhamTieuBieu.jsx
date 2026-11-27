import { useState, useEffect } from 'react'
import { Plus, Sparkles } from 'lucide-react'
import { danhSachSanPham } from '../../data/duLieu.js'
import './SanPhamTieuBieu.css'

const dinhDangGia = (gia) => {
  return `${(gia || 0).toLocaleString('vi-VN')}đ`
}

const CATEGORIES = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 1, label: 'Áo thun' },
  { id: 2, label: 'Áo hoodie' },
  { id: 3, label: 'Phụ kiện' },
]

export default function SanPhamTieuBieu({
  themVaoGio,
  onSelectProduct,
  activeCategory = 'ALL',
  onSelectCategory,
}) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let isMounted = true
    const fetchProducts = async () => {
      try {
        setLoading(true)
        const res = await fetch('http://localhost:5000/api/store/products')
        const json = await res.json().catch(() => ({}))
        if (isMounted && res.ok && json.success && json.data.length > 0) {
          setProducts(json.data)
        } else if (isMounted) {
          setProducts(danhSachSanPham)
        }
      } catch (err) {
        console.warn('Lỗi kết nối API store/products, dùng dữ liệu dự phòng:', err)
        if (isMounted) setProducts(danhSachSanPham)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchProducts()
    return () => {
      isMounted = false
    }
  }, [])

  const handleCategoryClick = (catId) => {
    onSelectCategory?.(catId)
  }

  const filteredProducts = products.filter((sp) => {
    if (activeCategory === 'ALL') return true
    if (sp.MaDanhMuc) {
      return sp.MaDanhMuc === Number(activeCategory)
    }
    // Fallback cho dữ liệu mock
    if (activeCategory === 1) return (sp.ten || '').toLowerCase().includes('áo') && !(sp.ten || '').toLowerCase().includes('khoác')
    if (activeCategory === 2) return (sp.ten || '').toLowerCase().includes('khoác') || (sp.ten || '').toLowerCase().includes('hoodie')
    if (activeCategory === 3) return (sp.ten || '').toLowerCase().includes('túi') || (sp.ten || '').toLowerCase().includes('phụ kiện')
    return true
  })

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

        {/* BỘ LỌC DANH MỤC */}
        <div className="bo-loc-danh-muc">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`nut-loc-danh-muc ${activeCategory === cat.id ? 'dang-chon' : ''}`}
              onClick={() => handleCategoryClick(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#71717a' }}>
            Đang tải danh sách sản phẩm...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#71717a' }}>
            Chưa có sản phẩm nào trong danh mục này.
          </div>
        ) : (
          <div className="luoi-san-pham">
            {filteredProducts.map((sanPham) => {
              const id = sanPham.MaSanPham || sanPham.id
              const ten = sanPham.TenSanPham || sanPham.ten
              const gia = sanPham.GiaBan || sanPham.gia
              const anh = sanPham.AnhDaiDien || sanPham.anh || '/img/sp1.png'
              const nhan = sanPham.HoTroIn ? 'In theo mẫu' : sanPham.nhan || 'Mới'

              return (
                <article
                  className="the-san-pham"
                  key={id}
                  onClick={() => onSelectProduct?.(id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="khung-anh-san-pham">
                    <img src={anh} alt={ten} />

                    <span className="nhan-san-pham">
                      {sanPham.HoTroIn ? <Sparkles size={11} style={{ display: 'inline', marginRight: 3 }} /> : null}
                      {nhan}
                    </span>

                    <button
                      className="nut-them-gio"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        themVaoGio({
                          id,
                          ten,
                          gia,
                          anh,
                        })
                      }}
                    >
                      <Plus />
                      Thêm vào giỏ
                    </button>
                  </div>

                  <h3>{ten}</h3>
                  <p>{dinhDangGia(gia)}</p>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
