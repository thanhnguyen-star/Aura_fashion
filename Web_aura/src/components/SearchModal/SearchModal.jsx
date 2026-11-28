import { useState, useEffect, useRef } from 'react';
import { Search, X, Sparkles, ArrowRight } from 'lucide-react';
import { API_BASE, resolveImageUrl } from '../../utils/api.js';
import './SearchModal.css';

function formatCurrency(val) {
  return `${(val || 0).toLocaleString('vi-VN')}đ`;
}

export default function SearchModal({
  isOpen,
  onClose,
  onSelectProduct,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  // Focus input khi mở modal
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => {
      setSearchTerm('');
    }, 0);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // Đóng modal khi nhấn phím Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Tải danh sách sản phẩm để tìm kiếm
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    const fetchList = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/store/products`);
        const json = await res.json().catch(() => ({}));
        if (isMounted && res.ok && json.success && Array.isArray(json.data)) {
          setAllProducts(json.data);
        }
      } catch (err) {
        console.warn('Lỗi kết nối tải sản phẩm tìm kiếm:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchList();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const keyword = searchTerm.trim().toLowerCase();
  const filteredProducts = keyword
    ? allProducts.filter((p) => {
        const name = (p.TenSanPham || p.ten || '').toLowerCase();
        const code = (p.MaHienThi || '').toLowerCase();
        const cat = (p.TenDanhMuc || '').toLowerCase();
        return name.includes(keyword) || code.includes(keyword) || cat.includes(keyword);
      })
    : allProducts;

  return (
    <div className="aura-search-overlay" onClick={onClose}>
      <div className="aura-search-card" onClick={(e) => e.stopPropagation()}>
        {/* Search Input Bar */}
        <div className="aura-search-bar">
          <Search size={20} />
          <input
            ref={inputRef}
            type="text"
            className="aura-search-input"
            placeholder="Tìm kiếm áo thun, hoodie, phụ kiện hoặc mã sản phẩm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button
            type="button"
            className="aura-search-close-btn"
            onClick={onClose}
            aria-label="Đóng tìm kiếm"
          >
            <X size={18} />
          </button>
        </div>

        {/* Results Container */}
        <div className="aura-search-results">
          {loading ? (
            <div className="aura-search-empty">Đang tải sản phẩm...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="aura-search-empty">
              Không tìm thấy sản phẩm nào khớp với từ khóa &ldquo;{searchTerm}&rdquo;.
            </div>
          ) : (
            <>
              <div className="aura-search-count">
                {keyword ? `Kết quả tìm kiếm (${filteredProducts.length})` : 'Gợi ý sản phẩm nổi bật'}
              </div>

              {filteredProducts.map((sp) => {
                const id = sp.MaSanPham || sp.id;
                const ten = sp.TenSanPham || sp.ten;
                const gia = sp.GiaBan || sp.gia;
                const anh = resolveImageUrl(sp.AnhDaiDien || sp.anh) || '/img/sp1.png';
                const hoTroIn = Boolean(sp.HoTroIn);

                return (
                  <div
                    key={id}
                    className="aura-search-item"
                    onClick={() => {
                      onSelectProduct?.(id);
                      onClose();
                    }}
                  >
                    <img src={anh} alt={ten} className="aura-search-thumb" />

                    <div className="aura-search-item-info">
                      <h4 className="aura-search-item-title">{ten}</h4>
                      <div className="aura-search-item-meta">
                        {sp.TenDanhMuc && (
                          <span className="aura-search-item-tag">{sp.TenDanhMuc}</span>
                        )}
                        {hoTroIn && (
                          <span
                            className="aura-search-item-tag"
                            style={{ background: '#ecfdf5', color: '#065f46' }}
                          >
                            <Sparkles size={10} style={{ display: 'inline', marginRight: 2 }} />
                            In DTG
                          </span>
                        )}
                        {sp.MaHienThi && <span>{sp.MaHienThi}</span>}
                      </div>
                    </div>

                    <div className="aura-search-item-price">{formatCurrency(gia)}</div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="aura-search-footer">
          <span>Nhấn <strong>ESC</strong> để đóng</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span>Xem chi tiết</span>
            <ArrowRight size={12} />
          </span>
        </div>
      </div>
    </div>
  );
}
