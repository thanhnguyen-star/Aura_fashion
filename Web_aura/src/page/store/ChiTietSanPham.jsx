import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ChevronRight,
  ShoppingBag,
  Zap,
  ShieldCheck,
  RefreshCw,
  Truck,
  Sparkles,
} from 'lucide-react';
import TuyChonIn from '../../components/TuyChonIn/TuyChonIn';
import '../css/chiTietSanPham.css';

function formatCurrency(val) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
}

export default function ChiTietSanPham({
  productId = 1,
  onBackToStore,
  onAddToCart,
  onBuyNow,
}) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Lựa chọn biến thể
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);

  // Lựa chọn tùy biến in từ TuyChonIn
  const [printConfig, setPrintConfig] = useState({
    hasPrint: true,
    location: null,
    template: null,
  });

  const fetchProductDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`http://localhost:5000/api/store/products/${productId}`);
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Không thể tải thông tin sản phẩm');
      }

      setProduct(data.data);

      // Tự động chọn màu sắc và kích thước đầu tiên
      if (data.data.variants && data.data.variants.length > 0) {
        const firstVariant = data.data.variants[0];
        setSelectedColor({
          id: firstVariant.MaMauSac,
          name: firstVariant.TenMau,
          hex: firstVariant.MaHex,
        });
        setSelectedSize({
          id: firstVariant.MaKichThuoc,
          name: firstVariant.TenKichThuoc,
        });
      }
    } catch (err) {
      console.error('Lỗi tải chi tiết sản phẩm:', err);
      setError(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProductDetail();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchProductDetail]);

  // Danh sách các màu duy nhất từ variants
  const availableColors = useMemo(() => {
    if (!product?.variants) return [];
    const colorMap = new Map();
    product.variants.forEach((v) => {
      if (!colorMap.has(v.MaMauSac)) {
        colorMap.set(v.MaMauSac, {
          id: v.MaMauSac,
          name: v.TenMau,
          hex: v.MaHex,
        });
      }
    });
    return Array.from(colorMap.values());
  }, [product]);

  // Danh sách các size duy nhất từ variants
  const availableSizes = useMemo(() => {
    if (!product?.variants) return [];
    const sizeMap = new Map();
    product.variants.forEach((v) => {
      if (!sizeMap.has(v.MaKichThuoc)) {
        sizeMap.set(v.MaKichThuoc, {
          id: v.MaKichThuoc,
          name: v.TenKichThuoc,
          order: v.ThuTuSize || 1,
        });
      }
    });
    return Array.from(sizeMap.values()).sort((a, b) => a.order - b.order);
  }, [product]);

  // Tìm biến thể cụ thể theo Color + Size đang chọn
  const activeVariant = useMemo(() => {
    if (!product?.variants || !selectedColor || !selectedSize) return null;
    return product.variants.find(
      (v) => v.MaMauSac === selectedColor.id && v.MaKichThuoc === selectedSize.id
    );
  }, [product, selectedColor, selectedSize]);

  const stockCount = activeVariant ? activeVariant.SoLuongTon : 0;
  const isOutOfStock = stockCount <= 0;

  // Xử lý Thêm vào giỏ
  const handleAddToCart = () => {
    if (!activeVariant || isOutOfStock) return;

    const cartItem = {
      id: `${product.MaSanPham}-${activeVariant.MaBienThe}-${printConfig.hasPrint ? printConfig.template?.MaMauIn : 'plain'}`,
      productId: product.MaSanPham,
      variantId: activeVariant.MaBienThe,
      name: product.TenSanPham,
      sku: activeVariant.SKU,
      size: selectedSize.name,
      color: selectedColor.name,
      colorHex: selectedColor.hex,
      price: product.GiaBan,
      quantity,
      hasPrint: printConfig.hasPrint,
      printLocation: printConfig.location?.TenViTri || null,
      printLocationId: printConfig.location?.MaViTriIn || null,
      printTemplate: printConfig.template?.TenMauIn || null,
      printTemplateId: printConfig.template?.MaMauIn || null,
      printImage: printConfig.template?.DuongDanPNG || null,
      productImage: product.images?.[0]?.DuongDan || '/img/sp1.png',
    };

    onAddToCart?.(cartItem);
  };

  const handleBuyNow = () => {
    if (!activeVariant || isOutOfStock) return;
    handleAddToCart();
    onBuyNow?.();
  };

  if (loading) {
    return (
      <div className="ctsp-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center', color: '#71717a' }}>
          <RefreshCw className="spin" size={28} style={{ margin: '0 auto 10px', display: 'block' }} />
          Đang tải thông tin sản phẩm và phòng thử in DTG...
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="ctsp-shell" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <p style={{ color: '#ef4444', fontSize: '15px' }}>{error || 'Sản phẩm không tồn tại hoặc đã ngừng kinh doanh'}</p>
        <button
          type="button"
          onClick={onBackToStore}
          style={{
            marginTop: '16px',
            background: '#09090b',
            color: '#fff',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Quay lại Cửa Hàng
        </button>
      </div>
    );
  }

  return (
    <div className="ctsp-shell">
      <div className="ctsp-container">
        {/* Breadcrumb Navigation */}
        <nav className="ctsp-breadcrumb">
          <button
            type="button"
            className="ctsp-bc-link"
            style={{ background: 'none', border: 'none', padding: 0 }}
            onClick={onBackToStore}
          >
            Trang chủ
          </button>
          <ChevronRight size={13} />
          <span className="ctsp-bc-link">{product.TenDanhMuc || 'Thời trang in'}</span>
          <ChevronRight size={13} />
          <span className="ctsp-bc-current">{product.TenSanPham}</span>
        </nav>

        {/* 2 Columns: Mockup Customizer Left & Product Info Right */}
        <div className="ctsp-grid">
          {/* CỘT TRÁI: MOCKUP CANVAS PREVIEW & TÙY BIẾN IN */}
          <div className="ctsp-left-col">
            <TuyChonIn
              colorHex={selectedColor?.hex || '#000000'}
              printTemplates={product.printTemplates || []}
              printLocations={product.printLocations || []}
              onPrintChange={setPrintConfig}
            />
          </div>

          {/* CỘT PHẢI: CHI TIẾT SẢN PHẨM & ĐẶT HÀNG */}
          <div className="ctsp-right-col">
            <div>
              <span className="ctsp-badge-support">
                <Sparkles size={13} />
                Hỗ trợ in theo mẫu · Không phụ phí in
              </span>

              <h1 className="ctsp-title">{product.TenSanPham}</h1>

              <div className="ctsp-meta-bar">
                <span>
                  Mã SP: <span className="ctsp-code">{activeVariant?.SKU || product.MaHienThi}</span>
                </span>
                <span>·</span>
                <span>Dòng sản phẩm: {product.TenDanhMuc}</span>
              </div>

              <div className="ctsp-price-box">
                <span className="ctsp-price">{formatCurrency(product.GiaBan)}</span>
                <span style={{ fontSize: '13px', color: '#10b981', fontWeight: 600 }}>Miễn phí in ấn DTG</span>
              </div>

              <p className="ctsp-desc">{product.MoTa}</p>
            </div>

            {/* Bộ Chọn Màu Sắc */}
            <div>
              <div className="ctsp-section-title">
                <span>1. Màu sắc áo: <strong>{selectedColor?.name}</strong></span>
              </div>
              <div className="ctsp-color-swatches">
                {availableColors.map((color) => {
                  const isActive = selectedColor?.id === color.id;
                  return (
                    <div
                      key={color.id}
                      className={`ctsp-swatch-item ${isActive ? 'active' : ''}`}
                      onClick={() => setSelectedColor(color)}
                    >
                      <div className="ctsp-swatch-circle" style={{ backgroundColor: color.hex }} />
                      <span className="ctsp-swatch-label">{color.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bộ Chọn Kích Cỡ */}
            <div>
              <div className="ctsp-section-title">
                <span>2. Kích thước (Size): <strong>{selectedSize?.name}</strong></span>
                <span style={{ fontSize: '11px', color: '#71717a', cursor: 'pointer', textDecoration: 'underline' }}>
                  Bảng thông số size
                </span>
              </div>
              <div className="ctsp-size-list">
                {availableSizes.map((size) => {
                  const isActive = selectedSize?.id === size.id;
                  // Kiểm tra tồn kho của size này với màu đang chọn
                  const v = product.variants.find(
                    (item) => item.MaMauSac === selectedColor?.id && item.MaKichThuoc === size.id
                  );
                  const isAvailable = v && v.SoLuongTon > 0;

                  return (
                    <button
                      key={size.id}
                      type="button"
                      disabled={!isAvailable}
                      className={`ctsp-size-btn ${isActive ? 'active' : ''}`}
                      onClick={() => setSelectedSize(size)}
                    >
                      {size.name}
                    </button>
                  );
                })}
              </div>

              {/* Chỉ báo tồn kho */}
              <div className="ctsp-stock-indicator">
                {isOutOfStock ? (
                  <span className="ctsp-stock-out">✕ Hết hàng (Vui lòng chọn size hoặc màu khác)</span>
                ) : (
                  <span className="ctsp-stock-available">
                    ✓ Còn <strong>{stockCount}</strong> sản phẩm sẵn sàng giao
                  </span>
                )}
              </div>
            </div>

            {/* Số lượng & Nút Thao Tác */}
            <div className="ctsp-actions-box">
              <div className="ctsp-qty-row">
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#18181b' }}>Số lượng:</span>
                <div className="ctsp-qty-control">
                  <button
                    type="button"
                    className="ctsp-qty-btn"
                    disabled={quantity <= 1}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  >
                    -
                  </button>
                  <span className="ctsp-qty-val">{quantity}</span>
                  <button
                    type="button"
                    className="ctsp-qty-btn"
                    disabled={quantity >= stockCount}
                    onClick={() => setQuantity((q) => Math.min(stockCount, q + 1))}
                  >
                    +
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  className="ctsp-btn-add"
                  disabled={isOutOfStock}
                  onClick={handleAddToCart}
                >
                  <ShoppingBag size={17} />
                  <span>Thêm Vào Giỏ Hàng</span>
                </button>

                <button
                  type="button"
                  className="ctsp-btn-buy"
                  disabled={isOutOfStock}
                  onClick={handleBuyNow}
                >
                  <Zap size={16} />
                  <span>Mua Ngay</span>
                </button>
              </div>
            </div>

            {/* Cam Kết Dịch Vụ */}
            <div className="ctsp-commitments">
              <div className="ctsp-cmt-item">
                <Truck size={17} color="#18181b" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>Giao hàng toàn quốc</strong>
                  <div>2 - 3 ngày làm việc, đóng gói hộp cao cấp.</div>
                </div>
              </div>

              <div className="ctsp-cmt-item">
                <ShieldCheck size={17} color="#18181b" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>Bảo hành in ấn DTG</strong>
                  <div>Cam kết mực in không bong tróc, chuẩn màu.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
