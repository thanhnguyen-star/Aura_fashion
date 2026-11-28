import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ShoppingBag,
  RefreshCw,
  Sparkles,
  Search,
} from 'lucide-react';
import TuyChonIn from '../../components/TuyChonIn/TuyChonIn';
import { API_BASE, resolveImageUrl } from '../../utils/api.js';
import '../css/chiTietSanPham.css';

function formatCurrency(val) {
  return new Intl.NumberFormat('vi-VN').format(val || 0) + 'đ';
}

export default function ChiTietSanPham({
  productId = 1,
  onBackToStore,
  onAddToCart,
  // eslint-disable-next-line no-unused-vars
  onBuyNow,
}) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Lựa chọn biến thể Size & Màu
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);

  // Lựa chọn tùy biến in: Mẫu in lớn & Logo nhỏ (mặc định Tay áo khi có mẫu lớn)
  const [printConfig, setPrintConfig] = useState({
    hasBigPrint: true,
    bigTemplate: null,
    hasLogo: true,
    logoLocation: 'TAY_AO', // 'KHONG_IN' | 'NGUC' | 'TAY_AO'
    logoTemplate: null,
  });

  // Trạng thái phóng to (hover zoom) trên mockup áo
  const [isZooming, setIsZooming] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const imgRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  }, []);

  const fetchProductDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/api/store/products/${productId}`);
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

      // Cập nhật mẫu in từ dữ liệu server nếu có
      if (data.data.printTemplates && data.data.printTemplates.length > 0) {
        const bigs = data.data.printTemplates.filter(
          (t) => t.LoaiMau === 'MAU_LON' || t.LoaiMau === 'A3'
        );
        const logos = data.data.printTemplates.filter((t) => t.LoaiMau === 'LOGO');

        setPrintConfig((prev) => ({
          ...prev,
          bigTemplate: bigs.length > 0 ? bigs[0] : (prev.bigTemplate || data.data.printTemplates[0]),
          logoTemplate: logos.length > 0 ? logos[0] : (prev.logoTemplate || null),
        }));
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

    const hasAnyPrint = Boolean(
      printConfig.hasBigPrint ||
      (printConfig.hasLogo && printConfig.logoLocation !== 'KHONG_IN')
    );

    const primaryTemplate = printConfig.hasBigPrint
      ? printConfig.bigTemplate
      : (printConfig.hasLogo ? printConfig.logoTemplate : null);

    const cartItem = {
      id: `${product.MaSanPham}-${activeVariant.MaBienThe}-${printConfig.hasBigPrint ? printConfig.bigTemplate?.MaMauIn : 'nobig'}-${printConfig.hasLogo ? (printConfig.logoTemplate?.MaMauIn + '-' + printConfig.logoLocation) : 'nologo'}`,
      productId: product.MaSanPham,
      variantId: activeVariant.MaBienThe,
      name: product.TenSanPham,
      sku: activeVariant.SKU,
      size: selectedSize.name,
      color: selectedColor.name,
      colorHex: selectedColor.hex,
      price: product.GiaBan,
      quantity,
      hasPrint: hasAnyPrint,
      printLocation: printConfig.logoLocation === 'NGUC' ? 'Ngực' : (printConfig.logoLocation === 'TAY_AO' ? 'Tay áo' : 'Giữa thân áo'),
      printLocationId: printConfig.logoLocation,
      printTemplate: primaryTemplate?.TenMauIn || null,
      printTemplateId: primaryTemplate?.MaMauIn || null,
      printImage: primaryTemplate?.DuongDanPNG || null,
      bigTemplate: printConfig.bigTemplate,
      logoTemplate: printConfig.logoTemplate,
      logoLocation: printConfig.logoLocation,
      productImage: resolveImageUrl(product.images?.[0]?.DuongDan) || '/img/sp1.png',
    };

    onAddToCart?.(cartItem);
  };

  // Build summary text cho selection
  const selectionSummary = useMemo(() => {
    const parts = [];
    if (printConfig.hasBigPrint && printConfig.bigTemplate) {
      parts.push(`Mẫu lớn ${printConfig.bigTemplate.TenMauIn} (giữa thân áo)`);
    }
    if (printConfig.hasLogo && printConfig.logoLocation !== 'KHONG_IN' && printConfig.logoTemplate) {
      const locName = printConfig.logoLocation === 'NGUC' ? 'ngực' : 'tay áo';
      parts.push(`Logo ${printConfig.logoTemplate.TenMauIn} (${locName})`);
    }
    return parts.length > 0
      ? `Đã chọn: ${parts.join(' · ')}`
      : 'Mẫu in không tính thêm phí';
  }, [printConfig]);

  if (loading) {
    return (
      <div className="ctsp-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center', color: '#71717a' }}>
          <RefreshCw className="spin" size={28} style={{ margin: '0 auto 10px', display: 'block' }} />
          Đang tải thông tin sản phẩm...
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
            onClick={onBackToStore}
          >
            TRANG CHỦ
          </button>
          <span className="ctsp-bc-sep">/</span>
          <span className="ctsp-bc-link">{product.TenDanhMuc || 'Áo thun'}</span>
          <span className="ctsp-bc-sep">/</span>
          <span className="ctsp-bc-current">{product.TenSanPham}</span>
        </nav>

        {/* 2 Columns Layout */}
        <div className="ctsp-grid">
          {/* CỘT TRÁI: Thông tin + Hình ảnh Mockup (Với Hover Zoom) */}
          <div className="ctsp-left-col">
            {/* Badge hỗ trợ in */}
            <span className="ctsp-badge-support">
              Hỗ trợ in theo mẫu · Không phụ phí in
            </span>

            {/* Tên sản phẩm */}
            <h1 className="ctsp-title">{product.TenSanPham}</h1>

            {/* Giá + Mã SP */}
            <div className="ctsp-price-row">
              <span className="ctsp-price">{formatCurrency(product.GiaBan)}</span>
              <span className="ctsp-sku">Mã sản phẩm: {activeVariant?.SKU || product.MaHienThi}</span>
            </div>

            {/* Mô tả ngắn */}
            {product.MoTa && (
              <p className="ctsp-desc">{product.MoTa}</p>
            )}

            {/* Khung Mockup Preview lớn với hover zoom */}
            <div
              className={`ctsp-image-wrapper ${isZooming ? 'zooming' : ''}`}
              ref={imgRef}
              onMouseEnter={() => setIsZooming(true)}
              onMouseLeave={() => setIsZooming(false)}
              onMouseMove={handleMouseMove}
              style={isZooming ? { '--zoom-x': `${zoomPos.x}%`, '--zoom-y': `${zoomPos.y}%` } : undefined}
            >
              <div className="ctsp-image-inner">
                <TuyChonIn
                  colorHex={selectedColor?.hex || '#000000'}
                  printTemplates={product.printTemplates || []}
                  printLocations={product.printLocations || []}
                  printConfig={printConfig}
                  onPrintChange={setPrintConfig}
                  mode="preview-only"
                />
              </div>
              <button type="button" className="ctsp-zoom-btn" aria-label="Phóng to">
                <Search size={18} />
              </button>
            </div>
          </div>

          {/* CỘT PHẢI: Tùy chọn + Mua hàng (một khung bordered duy nhất) */}
          <div className="ctsp-right-col">
            <div className="ctsp-options-panel">
              {/* Kích cỡ */}
              <div className="ctsp-option-group">
                <div className="ctsp-option-header">
                  <span className="ctsp-option-label">KÍCH CỠ</span>
                  <button type="button" className="ctsp-size-guide-link">
                    <Sparkles size={12} />
                    Bảng quy đổi size
                  </button>
                </div>
                <div className="ctsp-size-list">
                  {availableSizes.map((size) => {
                    const isActive = selectedSize?.id === size.id;
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
                    <span className="ctsp-stock-out">Hết hàng</span>
                  ) : (
                    <span className="ctsp-stock-available">
                      Còn {stockCount} sản phẩm
                    </span>
                  )}
                </div>
              </div>

              {/* Đường kẻ phân cách */}
              <div className="ctsp-divider" />

              {/* Màu sắc + Số lượng cùng hàng */}
              <div className="ctsp-color-qty-row">
                <div className="ctsp-color-group">
                  <span className="ctsp-option-label">MÀU SẮC: <strong>{selectedColor?.name}</strong></span>
                  <div className="ctsp-color-swatches">
                    {availableColors.map((color) => {
                      const isActive = selectedColor?.id === color.id;
                      return (
                        <div
                          key={color.id}
                          className={`ctsp-swatch-item ${isActive ? 'active' : ''}`}
                          onClick={() => setSelectedColor(color)}
                          title={color.name}
                        >
                          <div className="ctsp-swatch-circle" style={{ backgroundColor: color.hex }} />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="ctsp-qty-group">
                  <span className="ctsp-option-label">SỐ LƯỢNG</span>
                  <div className="ctsp-qty-control">
                    <button
                      type="button"
                      className="ctsp-qty-btn"
                      disabled={quantity <= 1}
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    >
                      −
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
              </div>

              {/* Đường kẻ phân cách */}
              <div className="ctsp-divider" />

              {/* Tùy chọn in - Selector */}
              <TuyChonIn
                colorHex={selectedColor?.hex || '#000000'}
                printTemplates={product.printTemplates || []}
                printLocations={product.printLocations || []}
                printConfig={printConfig}
                onPrintChange={setPrintConfig}
                mode="selector"
              />

              {/* Tóm tắt lựa chọn */}
              <div className="ctsp-selection-summary">
                <Sparkles size={13} />
                <span>{selectionSummary}</span>
              </div>

              {/* Nút Thêm Vào Giỏ Hàng lớn */}
              <button
                type="button"
                className="ctsp-btn-add"
                disabled={isOutOfStock}
                onClick={handleAddToCart}
              >
                <ShoppingBag size={18} />
                <span>Thêm Vào Giỏ Hàng — {formatCurrency(product.GiaBan)}</span>
              </button>

              {/* Chú thích nhỏ */}
              <p className="ctsp-print-note">Mẫu in không tính thêm phí</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
