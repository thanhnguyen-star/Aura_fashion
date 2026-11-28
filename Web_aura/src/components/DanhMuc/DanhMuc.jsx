import { ArrowUpRight } from 'lucide-react'
import { danhSachDanhMuc } from '../../data/duLieu.js'
import { resolveImageUrl } from '../../utils/api.js'
import './DanhMuc.css'

export default function DanhMuc({
  categoryTree = [],
  onSelectCategory,
  onViewAllProducts,
}) {
  const items =
    categoryTree.length > 0
      ? categoryTree.map((cat) => ({
          id: cat.MaDanhMuc,
          slug: cat.Slug,
          ten:
            cat.Slug === 'nam' || cat.Slug === 'nu'
              ? `Thời trang ${cat.TenDanhMuc.toLowerCase()}`
              : cat.TenDanhMuc,
          moTa: cat.MoTa || `Bộ sưu tập ${cat.TenDanhMuc} từ AURA Studio.`,
          anh:
            resolveImageUrl(cat.AnhDaiDien || cat.AnhBia) ||
            '/img/nam/aokhoac.jpg',
        }))
      : danhSachDanhMuc

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

        <a
          href="#san-pham"
          onClick={(e) => {
            e.preventDefault()
            onViewAllProducts?.()
          }}
        >
          Xem sản phẩm →
        </a>
      </div>

      <div className="luoi-danh-muc">
        {items.map((danhMuc, viTri) => (
          <a
            className="the-danh-muc"
            href={`#danh-muc-${danhMuc.slug}`}
            key={danhMuc.id}
            style={{ '--do-tre': `${viTri * 120}ms` }}
            onClick={(e) => {
              e.preventDefault()
              onSelectCategory?.(danhMuc.slug)
            }}
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
