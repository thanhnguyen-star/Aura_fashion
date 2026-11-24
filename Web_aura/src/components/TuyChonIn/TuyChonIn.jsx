import { useState, useEffect } from 'react';
import { Sparkles, SlidersHorizontal } from 'lucide-react';
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

export default function TuyChonIn({
  colorHex = '#000000',
  printTemplates = [],
  printLocations = [],
  onPrintChange,
}) {
  const [hasPrint, setHasPrint] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Khởi tạo giá trị mặc định khi có dữ liệu
  useEffect(() => {
    const timer = setTimeout(() => {
      if (printLocations.length > 0 && !selectedLocation) {
        setSelectedLocation(printLocations[0]);
      }
      if (printTemplates.length > 0 && !selectedTemplate) {
        setSelectedTemplate(printTemplates[0]);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [printLocations, printTemplates, selectedLocation, selectedTemplate]);

  // Báo cho component cha khi thay đổi tùy chọn in
  useEffect(() => {
    onPrintChange?.({
      hasPrint,
      location: hasPrint ? selectedLocation : null,
      template: hasPrint ? selectedTemplate : null,
    });
  }, [hasPrint, selectedLocation, selectedTemplate, onPrintChange]);

  // Xác định class tọa độ in
  const getPositionClass = () => {
    if (!selectedLocation) return 'tci-pos-a3-front';
    const code = selectedLocation.MaViTri || '';
    if (code === 'MAU_LON') return 'tci-pos-a3-front';
    if (code === 'NGUC_TRAI') return 'tci-pos-nguc-trai';
    if (code === 'TAY_AO') return 'tci-pos-tay-ao';
    if (code === 'GAY_CO') return 'tci-pos-gay-co';
    return 'tci-pos-a3-front';
  };

  return (
    <div className="tci-container">
      {/* KHUNG MOCKUP PREVIEW THỜI GIAN THỰC */}
      <div className="tci-mockup-wrapper">
        <ShirtVector colorHex={colorHex} />

        {/* Lớp in đè lên phôi áo */}
        {hasPrint && selectedTemplate && (
          <div className={`tci-print-layer ${getPositionClass()}`}>
            <img
              src={selectedTemplate.DuongDanPNG}
              alt={selectedTemplate.TenMauIn}
              className="tci-print-img"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Badge thông tin mockup */}
        <div className="tci-mockup-badge">
          <Sparkles size={13} color="#10b981" />
          <span>
            {hasPrint && selectedTemplate
              ? `Mockup DTG · Vị trí: ${selectedLocation?.TenViTri || 'Mặt trước'}`
              : 'Phôi áo trơn tiêu chuẩn'}
          </span>
        </div>
      </div>

      {/* PANEL TÙY BIẾN IN */}
      <div className="tci-panel">
        <div className="tci-panel-header">
          <h3 className="tci-panel-title">
            <SlidersHorizontal size={16} />
            Tùy Biến In Theo Yêu Cầu
          </h3>
          <span className="tci-zero-fee-badge">Không phụ phí in ấn</span>
        </div>

        {/* Chọn chế độ: In mẫu hay Áo trơn */}
        <div className="tci-mode-toggle">
          <button
            type="button"
            className={`tci-mode-btn ${hasPrint ? 'active' : ''}`}
            onClick={() => setHasPrint(true)}
          >
            In Theo Mẫu (+0đ)
          </button>
          <button
            type="button"
            className={`tci-mode-btn ${!hasPrint ? 'active' : ''}`}
            onClick={() => setHasPrint(false)}
          >
            Áo Phôi Trơn
          </button>
        </div>

        {hasPrint && (
          <>
            {/* Chọn vị trí in */}
            <div>
              <span className="tci-section-label">1. Chọn Vị Trí In Ấn:</span>
              <div className="tci-locations-list">
                {printLocations.map((loc) => {
                  const isActive = selectedLocation?.MaViTriIn === loc.MaViTriIn;
                  return (
                    <button
                      key={loc.MaViTriIn}
                      type="button"
                      className={`tci-loc-btn ${isActive ? 'active' : ''}`}
                      onClick={() => setSelectedLocation(loc)}
                    >
                      {loc.TenViTri}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chọn mẫu in PNG trong suốt */}
            <div>
              <span className="tci-section-label">2. Chọn Mẫu In PNG Trong Suốt:</span>
              {printTemplates.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#71717a' }}>Đang tải thư viện mẫu in...</div>
              ) : (
                <div className="tci-templates-grid">
                  {printTemplates.map((tpl) => {
                    const isActive = selectedTemplate?.MaMauIn === tpl.MaMauIn;
                    return (
                      <div
                        key={tpl.MaMauIn}
                        className={`tci-tpl-card ${isActive ? 'active' : ''}`}
                        onClick={() => setSelectedTemplate(tpl)}
                        title={tpl.TenMauIn}
                      >
                        <img
                          src={tpl.DuongDanPNG}
                          alt={tpl.TenMauIn}
                          className="tci-tpl-img"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                        <span className="tci-tpl-name">{tpl.TenMauIn}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
