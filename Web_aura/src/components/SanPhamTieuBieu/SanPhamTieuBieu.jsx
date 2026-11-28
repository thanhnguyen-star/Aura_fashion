import { useEffect, useMemo, useState } from 'react'
import { Plus, Sparkles } from 'lucide-react'
import { API_BASE, resolveImageUrl } from '../../utils/api.js'
import { danhSachSanPham } from '../../data/duLieu.js'
import './SanPhamTieuBieu.css'

const dinhDangGia = (gia) => {
  return `${(gia || 0).toLocaleString('vi-VN')}đ`
}

function collectNodeIds(node) {
  const ids = new Set([Number(node.MaDanhMuc)])
  for (const child of node.children || []) {
    for (const cid of collectNodeIds(child)) {
      ids.add(cid)
    }
  }
  return ids
}

export default function SanPhamTieuBieu({
  themVaoGio,
  onSelectProduct,
  categoryTree = [],
  refreshKey = 0,
  activeCategory = 'ALL',
  onSelectCategory,
  onViewAllProducts,
}) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let isMounted = true
    const fetchProducts = async () => {
      try {
        setLoading(true)
        const res = await fetch(`${API_BASE}/api/store/products`)
        const json = await res.json().catch(() => ({}))
        if (isMounted && res.ok && json.success) {
          setProducts(json.data || [])
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
  }, [refreshKey])

  const categoryTabs = useMemo(() => {
    const roots = categoryTree.map((cat) => ({
      id: cat.Slug,
      label: cat.TenDanhMuc,
      ids: collectNodeIds(cat),
    }))
    return [{ id: 'ALL', label: 'Tất cả', ids: null }, ...roots]
  }, [categoryTree])

  const activeTabObj =
    categoryTabs.find((t) => t.id === activeCategory) || categoryTabs[0]

  const filteredProducts = useMemo(() => {
    const matched =
      !activeTabObj?.ids
        ? products
        : products.filter((sp) =>
          activeTabObj.ids.has(Number(sp.MaDanhMuc)),
        )
    return matched.slice(0, 8)
  }, [products, activeTabObj])

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

          <a
            href="#san-pham"
            onClick={(e) => {
              e.preventDefault()
              onViewAllProducts?.()
            }}
          >
            Xem tất cả →
          </a>
        </div>

        {/* BỘ LỌC DANH MỤC ĐỌC TỪ DB */}
        <div className="bo-loc-danh-muc">
          {categoryTabs.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`nut-loc-danh-muc ${activeTabObj?.id === cat.id ? 'dang-chon' : ''}`}
              onClick={() => onSelectCategory?.(cat.id)}
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
              const anh = resolveImageUrl(sanPham.AnhDaiDien || sanPham.anh) || '/img/sp1.png'
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
                      {sanPham.HoTroIn ? (
                        <Sparkles size={11} style={{ display: 'inline', marginRight: 3 }} />
                      ) : null}
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
