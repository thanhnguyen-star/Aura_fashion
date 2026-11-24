import { useMemo } from 'react';
import { Ban, Check } from 'lucide-react';
import './TuyChonIn.css';

// SVG Áo Thun Tối Giản hỗ trợ đổi màu Hex động
function ShirtVector({ colorHex = '#000000' }) {
  const isLight =
    colorHex.toLowerCase() === '#ffffff' ||
    colorHex.toLowerCase() === '#e4d8c9' ||
    colorHex.toLowerCase() === '#fafafa';

  return (
    <svg
      className="tci-shirt-svg"
      viewBox="0 0 500 600"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Thân áo & Tay áo */}
      <path
        d="M170 50 L120 70 L30 150 L80 230 L130 190 L130 550 L370 550 L370 190 L420 230 L470 150 L380 70 L330 50 C310 90 190 90 170 50 Z"
        fill={colorHex}
        stroke={isLight ? '#d4d4d8' : '#18181b'}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Bo Cổ áo */}
      <path
        d="M170 50 C200 95 300 95 330 50"
        stroke={isLight ? '#a1a1aa' : '#27272a'}
        strokeWidth="4"
        fill="none"
      />
      {/* Đường may gấu tay & vạt áo */}
      <path
        d="M30 150 L80 230 M470 150 L420 230"
        stroke={isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)'}
        strokeWidth="2"
      />
      <line
        x1="130"
        y1="535"
        x2="370"
        y2="535"
        stroke={isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)'}
        strokeWidth="2"
        strokeDasharray="4 4"
      />
    </svg>
  );
}

// Icon áo với vị trí Ngực
function ChestPositionIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8" cy="8" r="2" fill="currentColor" />
    </svg>
  );
}

// Icon áo với vị trí Tay áo
function SleevePositionIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="5" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}

// Danh sách mẫu fallback chuẩn
const DEFAULT_BIG_TEMPLATES = [
  { MaMauIn: 'big-1', TenMauIn: 'Geometric', DuongDanPNG: '/img/big/Big1.png', LoaiMau: 'MAU_LON' },
  { MaMauIn: 'big-2', TenMauIn: 'Isometric', DuongDanPNG: '/img/big/Big2.png', LoaiMau: 'MAU_LON' },
  { MaMauIn: 'big-3', TenMauIn: 'Topology', DuongDanPNG: '/img/big/Big3.png', LoaiMau: 'MAU_LON' },
  { MaMauIn: 'big-4', TenMauIn: 'Minimalist', DuongDanPNG: '/img/big/Big4.png', LoaiMau: 'MAU_LON' },
];

const DEFAULT_LOGO_TEMPLATES = [
  { MaMauIn: 'logo-1', TenMauIn: 'AURA Monogram', DuongDanPNG: '/img/logo/logo1.png', LoaiMau: 'LOGO' },
  { MaMauIn: 'logo-2', TenMauIn: 'AURA Box', DuongDanPNG: '/img/logo/logo2.png', LoaiMau: 'LOGO' },
  { MaMauIn: 'logo-3', TenMauIn: 'AURA Mini', DuongDanPNG: '/img/logo/logo3.png', LoaiMau: 'LOGO' },
];

export default function TuyChonIn({
  colorHex = '#000000',
  printTemplates = [],
  // eslint-disable-next-line no-unused-vars
  printLocations = [],
  printConfig,
  onPrintChange,
  mode = 'full', // 'preview-only' | 'selector' | 'full'
}) {
  // Phân loại mẫu in lớn & logo nhỏ từ props hoặc fallback
  const bigTemplates = useMemo(() => {
    const list = printTemplates.filter(
      (t) => t.LoaiMau === 'MAU_LON' || t.LoaiMau === 'A3'
    );
    if (list.length > 0) return list;
    return printTemplates.length > 0 ? printTemplates : DEFAULT_BIG_TEMPLATES;
  }, [printTemplates]);

  const logoTemplates = useMemo(() => {
    const list = printTemplates.filter((t) => t.LoaiMau === 'LOGO');
    if (list.length > 0) return list;
    return DEFAULT_LOGO_TEMPLATES;
  }, [printTemplates]);

  // Cấu hình hiện tại (dùng từ props hoặc fallback an toàn)
  const currentConfig = useMemo(() => {
    return {
      hasBigPrint: printConfig?.hasBigPrint ?? true,
      bigTemplate: printConfig?.bigTemplate ?? bigTemplates[0],
      hasLogo: printConfig?.hasLogo ?? true,
      logoLocation: printConfig?.logoLocation ?? 'NGUC', // 'KHONG_IN' | 'NGUC' | 'TAY_AO'
      logoTemplate: printConfig?.logoTemplate ?? logoTemplates[0],
    };
  }, [printConfig, bigTemplates, logoTemplates]);

  // ==============================================================
  // MODE: PREVIEW ONLY (Hiển thị áo mockup với mẫu in & logo trực quan)
  // ==============================================================
  if (mode === 'preview-only') {
    const { hasBigPrint, bigTemplate, hasLogo, logoLocation, logoTemplate } = currentConfig;

    return (
      <div className="tci-preview-wrapper">
        <ShirtVector colorHex={colorHex} />

        {/* 1. MẪU IN LỚN - HIỂN THỊ NGAY GIỮA NGỰC / THÂN ÁO */}
        {hasBigPrint && bigTemplate && (
          <div className="tci-big-print-box">
            <div className="tci-big-label-tag">
              <span>MẪU LỚN</span>
              <span>25 × 30 cm</span>
            </div>
            <img
              src={bigTemplate.DuongDanPNG}
              alt={bigTemplate.TenMauIn}
              className="tci-big-print-img"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        )}

        {/* 2. LOGO NHỎ - HIỂN THỊ TẠI NGỰC HOẶC TAY ÁO */}
        {hasLogo && logoLocation !== 'KHONG_IN' && logoTemplate && (
          <div
            className={`tci-logo-layer ${
              logoLocation === 'NGUC' ? 'tci-pos-nguc' : 'tci-pos-tay-ao'
            }`}
          >
            <img
              src={logoTemplate.DuongDanPNG}
              alt={logoTemplate.TenMauIn}
              className="tci-logo-img"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <span className="tci-logo-tag">
              {logoLocation === 'NGUC' ? 'Ngực' : 'Tay áo'}
            </span>
          </div>
        )}

        {/* Badge thông tin mẫu in */}
        {hasBigPrint && bigTemplate && (
          <div className="tci-template-badge">
            {bigTemplate.TenMauIn}
          </div>
        )}
      </div>
    );
  }

  // ==============================================================
  // MODE: SELECTOR (Các ô tùy chọn bên cột phải)
  // ==============================================================
  if (mode === 'selector') {
    const { hasBigPrint, bigTemplate, logoLocation, logoTemplate } = currentConfig;

    const handleSelectBigTemplate = (tpl) => {
      onPrintChange?.({
        ...currentConfig,
        hasBigPrint: true,
        bigTemplate: tpl,
      });
    };

    const handleDisableBigPrint = () => {
      onPrintChange?.({
        ...currentConfig,
        hasBigPrint: false,
      });
    };

    const handleSelectLogoLocation = (loc) => {
      onPrintChange?.({
        ...currentConfig,
        logoLocation: loc,
        hasLogo: loc !== 'KHONG_IN',
      });
    };

    const handleSelectLogoTemplate = (tpl) => {
      onPrintChange?.({
        ...currentConfig,
        hasLogo: true,
        logoTemplate: tpl,
      });
    };

    return (
      <div className="tci-selector">
        {/* ——— MẪU IN LỚN · GIỮA THÂN ÁO ——— */}
        <div className="tci-selector-group">
          <div className="tci-selector-header">
            <span className="tci-selector-label">MẪU IN LỚN · GIỮA THÂN ÁO</span>
            <span className="tci-selector-info">
              Vị trí cố định · Chọn tối đa 1 mẫu · Khổ 25 × 30 cm
            </span>
          </div>

          <div className="tci-selector-options">
            {/* Không in */}
            <div
              className={`tci-opt-card ${!hasBigPrint ? 'active' : ''}`}
              onClick={handleDisableBigPrint}
            >
              {!hasBigPrint && (
                <div className="tci-check-badge">
                  <Check size={10} strokeWidth={3} />
                </div>
              )}
              <div className="tci-opt-icon">
                <Ban size={20} />
              </div>
              <span className="tci-opt-name">Không in</span>
            </div>

            {/* Danh sách các mẫu in lớn */}
            {bigTemplates.map((tpl) => {
              const isActive = hasBigPrint && bigTemplate?.MaMauIn === tpl.MaMauIn;
              return (
                <div
                  key={tpl.MaMauIn}
                  className={`tci-opt-card ${isActive ? 'active' : ''}`}
                  onClick={() => handleSelectBigTemplate(tpl)}
                  title={tpl.TenMauIn}
                >
                  {isActive && (
                    <div className="tci-check-badge">
                      <Check size={10} strokeWidth={3} />
                    </div>
                  )}
                  <div className="tci-opt-icon">
                    <img
                      src={tpl.DuongDanPNG}
                      alt={tpl.TenMauIn}
                      className="tci-opt-img"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                  <span className="tci-opt-name">{tpl.TenMauIn}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ——— LOGO NHỎ ——— */}
        <div className="tci-selector-group">
          <div className="tci-selector-header">
            <span className="tci-selector-label">LOGO NHỎ</span>
            <span className="tci-selector-info">
              Chọn 1 vị trí và 1 logo · Khổ 4 × 4 cm
            </span>
          </div>

          {/* Vị trí logo: Gồm có Không in, Ngực và Tay áo */}
          <div className="tci-selector-subheader">Vị trí logo:</div>
          <div className="tci-selector-options">
            {/* Không in logo */}
            <div
              className={`tci-opt-card ${logoLocation === 'KHONG_IN' ? 'active' : ''}`}
              onClick={() => handleSelectLogoLocation('KHONG_IN')}
            >
              {logoLocation === 'KHONG_IN' && (
                <div className="tci-check-badge">
                  <Check size={10} strokeWidth={3} />
                </div>
              )}
              <div className="tci-opt-icon">
                <Ban size={20} />
              </div>
              <span className="tci-opt-name">Không in</span>
            </div>

            {/* Vị trí Ngực */}
            <div
              className={`tci-opt-card ${logoLocation === 'NGUC' ? 'active' : ''}`}
              onClick={() => handleSelectLogoLocation('NGUC')}
            >
              {logoLocation === 'NGUC' && (
                <div className="tci-check-badge">
                  <Check size={10} strokeWidth={3} />
                </div>
              )}
              <div className="tci-opt-icon">
                <ChestPositionIcon />
              </div>
              <span className="tci-opt-name">Ngực</span>
            </div>

            {/* Vị trí Tay áo */}
            <div
              className={`tci-opt-card ${logoLocation === 'TAY_AO' ? 'active' : ''}`}
              onClick={() => handleSelectLogoLocation('TAY_AO')}
            >
              {logoLocation === 'TAY_AO' && (
                <div className="tci-check-badge">
                  <Check size={10} strokeWidth={3} />
                </div>
              )}
              <div className="tci-opt-icon">
                <SleevePositionIcon />
              </div>
              <span className="tci-opt-name">Tay áo</span>
            </div>
          </div>
        </div>

        {/* ——— CHỌN LOGO (khi vị trí khác "Không in") ——— */}
        {logoLocation !== 'KHONG_IN' && (
          <div className="tci-selector-group">
            <div className="tci-selector-subheader">Chọn logo:</div>
            <div className="tci-logo-grid">
              {logoTemplates.map((tpl) => {
                const isActive = logoTemplate?.MaMauIn === tpl.MaMauIn;
                return (
                  <div
                    key={`logo-${tpl.MaMauIn}`}
                    className={`tci-logo-card ${isActive ? 'active' : ''}`}
                    onClick={() => handleSelectLogoTemplate(tpl)}
                  >
                    {isActive && (
                      <div className="tci-check-badge">
                        <Check size={10} strokeWidth={3} />
                      </div>
                    )}
                    <img
                      src={tpl.DuongDanPNG}
                      alt={tpl.TenMauIn}
                      className="tci-logo-img-thumb"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    <span className="tci-logo-name">{tpl.TenMauIn}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
