import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Clock,
  PieChart as PieChartIcon,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { adminFetch } from '../../utils/api';
import AdminLayout from './AdminLayout';
import '../css/adminDashboard.css';

const RANGE_OPTIONS = [
  { key: '7d', label: '7 ngày qua' },
  { key: 'this_month', label: 'Tháng này' },
  { key: 'last_month', label: 'Tháng trước' },
  { key: 'this_year', label: 'Năm nay' },
];

const VALID_RANGE_KEYS = new Set(RANGE_OPTIONS.map((opt) => opt.key));

const DONUT_COLORS = [
  '#1d53d4', // Xanh chủ đạo AURA
  '#3b82f6',
  '#0f172a',
  '#06b6d4',
  '#6366f1',
  '#94a3b8', // Màu cho nhóm "Khác"
];

function getRangeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const q = params.get('range');
  return VALID_RANGE_KEYS.has(q) ? q : '7d';
}

function syncRangeToUrl(rangeKey) {
  const url = new URL(window.location.href);
  if (url.searchParams.get('range') === rangeKey) return;
  url.searchParams.set('range', rangeKey);
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

function formatVND(amount, spaceBeforeUnit = false) {
  const formatted = new Intl.NumberFormat('vi-VN').format(Math.round(Number(amount) || 0));
  return spaceBeforeUnit ? `${formatted} đ` : `${formatted}đ`;
}

function formatNumber(val) {
  return new Intl.NumberFormat('vi-VN').format(Number(val) || 0);
}

function formatPercent(val) {
  const num = Number(val) || 0;
  return `${new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: Number.isInteger(num) ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(num)}%`;
}

function formatYAxisVND(value) {
  const num = Number(value) || 0;
  if (num === 0) return '0';
  if (num >= 1_000_000_000) {
    return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(num / 1_000_000_000)}tỷ`;
  }
  if (num >= 1_000_000) {
    return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(num / 1_000_000)}tr`;
  }
  if (num >= 1_000) {
    return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(num / 1_000)}k`;
  }
  return String(num);
}

function GrowthBadge({ growth }) {
  if (!growth) return null;
  const { status, label } = growth;

  if (status === 'new') {
    return (
      <span className="ad-growth-badge ad-growth-new">
        <Sparkles size={11} />
        <span>{label}</span>
      </span>
    );
  }

  if (status === 'up') {
    return (
      <span className="ad-growth-badge ad-growth-up">
        <ArrowUpRight size={12} strokeWidth={2.4} />
        <span>{label}</span>
      </span>
    );
  }

  if (status === 'down') {
    return (
      <span className="ad-growth-badge ad-growth-down">
        <ArrowDownRight size={12} strokeWidth={2.4} />
        <span>{label}</span>
      </span>
    );
  }

  return <span className="ad-growth-badge ad-growth-neutral">{label}</span>;
}

function RevenueTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div className="ad-chart-tooltip">
      <div className="ad-tooltip-title">{label}</div>
      <div className="ad-tooltip-row">
        <span className="ad-tooltip-label">
          <span className="ad-dot-solid" />
          Kỳ này {row.currentDateLabel ? `(${row.currentDateLabel})` : ''}
        </span>
        <strong className="ad-tooltip-val">
          {row.currentRevenue !== null && row.currentRevenue !== undefined
            ? formatVND(row.currentRevenue, true)
            : '—'}
        </strong>
      </div>
      <div className="ad-tooltip-row">
        <span className="ad-tooltip-label">
          <span className="ad-dot-dashed" />
          Kỳ trước {row.previousDateLabel ? `(${row.previousDateLabel})` : ''}
        </span>
        <strong className="ad-tooltip-val-muted">
          {row.previousRevenue !== null && row.previousRevenue !== undefined
            ? formatVND(row.previousRevenue, true)
            : '—'}
        </strong>
      </div>
    </div>
  );
}

function DonutTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0]?.payload;
  if (!item) return null;

  return (
    <div className="ad-chart-tooltip">
      <div className="ad-tooltip-title">{item.name}</div>
      <div className="ad-tooltip-row">
        <span className="ad-tooltip-label">Doanh thu</span>
        <strong className="ad-tooltip-val">{formatVND(item.value, true)}</strong>
      </div>
      <div className="ad-tooltip-row">
        <span className="ad-tooltip-label">Tỷ trọng</span>
        <strong className="ad-tooltip-val">{formatPercent(item.percentage)}</strong>
      </div>
    </div>
  );
}

export default function AdminDashboard({
  adminUser,
  onNavigate,
  onLogout,
  onBackToStore,
}) {
  const [range, setRange] = useState(() => getRangeFromUrl());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Đảm bảo ?range= được đồng bộ lên URL khi vào trang
  useEffect(() => {
    syncRangeToUrl(range);
  }, [range]);

  // Hỗ trợ nút Back/Forward trên trình duyệt
  useEffect(() => {
    const handlePopState = () => {
      setLoading(true);
      setError('');
      setRange(getRangeFromUrl());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const fetchDashboardData = useCallback(async (selectedRange) => {
    const res = await adminFetch(`/api/admin/dashboard?range=${encodeURIComponent(selectedRange)}`);
    return res;
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchDashboardData(range)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setError('');
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.status === 401 || err.status === 403) {
          onLogout?.();
          return;
        }
        setError(err.message || 'Không thể tải dữ liệu thống kê');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [range, fetchDashboardData, onLogout]);

  const handleSelectRange = (nextRange) => {
    if (nextRange === range) return;
    setLoading(true);
    setError('');
    setRange(nextRange);
    syncRangeToUrl(nextRange);
  };

  const handleRetry = () => {
    setLoading(true);
    setError('');
    fetchDashboardData(range)
      .then((res) => {
        setData(res);
        setError('');
      })
      .catch((err) => {
        if (err.status === 401 || err.status === 403) {
          onLogout?.();
          return;
        }
        setError(err.message || 'Không thể tải dữ liệu thống kê');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const kpis = data?.kpis;
  const revenueSeries = useMemo(() => data?.revenueSeries || [], [data]);
  const categoryItems = useMemo(() => data?.categoryBreakdown?.items || [], [data]);
  const categoryTotal = data?.categoryBreakdown?.total || 0;

  const hasRevenueSeriesData = useMemo(
    () =>
      revenueSeries.some(
        (pt) => (Number(pt.currentRevenue) || 0) > 0 || (Number(pt.previousRevenue) || 0) > 0,
      ),
    [revenueSeries],
  );

  const orderDiffText = useMemo(() => {
    if (!kpis?.orders) return '';
    const diff = Number(kpis.orders.diff) || 0;
    if (diff > 0) return `+${formatNumber(diff)} đơn so với kỳ trước`;
    if (diff < 0) return `${formatNumber(diff)} đơn so với kỳ trước`;
    return 'Không đổi so với kỳ trước';
  }, [kpis]);

  return (
    <AdminLayout
      activeMenu="dashboard"
      adminUser={adminUser}
      onSelectMenu={onNavigate}
      onLogout={onLogout}
      onBackToStore={onBackToStore}
    >
      {/* Header: Tiêu đề + Bộ chọn kỳ */}
      <div className="ad-header">
        <div>
          <h1 className="aura-page-title">Thống kê tổng quan</h1>
          <p className="ad-header-sub">
            {data?.periodMeta
              ? `Kỳ hiện tại: ${data.periodMeta.currentLabel} · So với: ${data.periodMeta.previousLabel} (loại đơn Hủy)`
              : 'Theo dõi doanh thu, đơn hàng và cơ cấu danh mục theo thời gian thực'}
          </p>
        </div>

        <div className="ad-range-picker" role="tablist" aria-label="Chọn kỳ thống kê">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              role="tab"
              aria-selected={range === opt.key}
              className={`ad-range-btn ${range === opt.key ? 'active' : ''}`}
              onClick={() => handleSelectRange(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="ad-error-banner">
          <span>Lỗi tải dữ liệu: {error}</span>
          <button
            type="button"
            className="ad-retry-btn"
            onClick={handleRetry}
          >
            <RefreshCw size={13} />
            <span>Thử lại</span>
          </button>
        </div>
      )}

      {/* Hàng 4 thẻ KPI */}
      {loading ? (
        <section className="aura-kpi-grid" aria-label="Đang tải chỉ số KPI">
          {[1, 2, 3, 4].map((idx) => (
            <div key={idx} className="aura-kpi-card ad-skeleton-card">
              <div className="ad-skel ad-skel-sm" />
              <div className="ad-skel ad-skel-lg" />
              <div className="ad-skel ad-skel-xs" />
            </div>
          ))}
        </section>
      ) : (
        <section className="aura-kpi-grid">
          {/* 1. Doanh thu */}
          <div className="aura-kpi-card ad-kpi-card">
            <div className="ad-kpi-top">
              <span className="aura-kpi-label">DOANH THU</span>
              <span className="ad-kpi-icon">
                <Wallet size={16} strokeWidth={1.9} />
              </span>
            </div>
            <p className="aura-kpi-value ad-kpi-value">
              {formatVND(kpis?.revenue?.current)}
            </p>
            <div className="ad-kpi-foot">
              <GrowthBadge growth={kpis?.revenue?.growth} />
              <span className="ad-kpi-hint">so với kỳ trước</span>
            </div>
          </div>

          {/* 2. Tổng đơn hàng */}
          <div className="aura-kpi-card ad-kpi-card">
            <div className="ad-kpi-top">
              <span className="aura-kpi-label">TỔNG ĐƠN HÀNG</span>
              <span className="ad-kpi-icon">
                <ShoppingBag size={16} strokeWidth={1.9} />
              </span>
            </div>
            <p className="aura-kpi-value ad-kpi-value">
              {formatNumber(kpis?.orders?.current)}
            </p>
            <div className="ad-kpi-foot">
              <GrowthBadge growth={kpis?.orders?.growth} />
              <span className="ad-kpi-hint">{orderDiffText}</span>
            </div>
          </div>

          {/* 3. Giá trị đơn trung bình */}
          <div className="aura-kpi-card ad-kpi-card">
            <div className="ad-kpi-top">
              <span className="aura-kpi-label">GIÁ TRỊ ĐƠN TRUNG BÌNH</span>
              <span className="ad-kpi-icon">
                <TrendingUp size={16} strokeWidth={1.9} />
              </span>
            </div>
            <p className="aura-kpi-value ad-kpi-value">
              {formatVND(kpis?.aov?.current)}
            </p>
            <div className="ad-kpi-foot">
              <GrowthBadge growth={kpis?.aov?.growth} />
              <span className="ad-kpi-hint">doanh thu / đơn hợp lệ</span>
            </div>
          </div>

          {/* 4. Đơn chờ xác nhận (clickable) */}
          <div
            role="button"
            tabIndex={0}
            className="aura-kpi-card ad-kpi-card ad-kpi-clickable"
            onClick={() => onNavigate?.('orders', { status: 'CHO_XAC_NHAN' })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onNavigate?.('orders', { status: 'CHO_XAC_NHAN' });
              }
            }}
            title="Bấm để lọc danh sách đơn chờ xác nhận"
          >
            <div className="ad-kpi-top">
              <span className="aura-kpi-label">ĐƠN CHỜ XÁC NHẬN</span>
              <span className="ad-kpi-icon ad-kpi-icon-warning">
                <Clock size={16} strokeWidth={1.9} />
              </span>
            </div>
            <p className="aura-kpi-value ad-kpi-value">
              {formatNumber(kpis?.pendingOrders)}
            </p>
            <div className="ad-kpi-foot">
              <span className="ad-kpi-action-link">
                <span>Xem đơn chờ xác nhận</span>
                <ArrowRight size={13} />
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Bố cục 2 cột biểu đồ */}
      <section className="ad-charts-grid">
        {/* Cột trái (rộng): Biểu đồ doanh thu 2 đường */}
        <div className="aura-card ad-chart-card">
          <div className="ad-chart-header">
            <div>
              <h2 className="aura-card-title">Biểu đồ doanh thu</h2>
              <p className="ad-chart-sub">
                {data?.granularity === 'month'
                  ? 'Gom theo tháng (múi giờ Asia/Ho_Chi_Minh)'
                  : 'Căn theo ngày thứ n của kỳ (múi giờ Asia/Ho_Chi_Minh)'}
              </p>
            </div>
            <div className="ad-line-legend">
              <span className="ad-legend-pill">
                <span className="ad-legend-line-solid" />
                Kỳ này
              </span>
              <span className="ad-legend-pill">
                <span className="ad-legend-line-dashed" />
                Kỳ trước
              </span>
            </div>
          </div>

          <div className="ad-chart-body">
            {loading ? (
              <div className="ad-chart-skeleton">
                <div className="ad-skel ad-skel-chart" />
              </div>
            ) : !hasRevenueSeriesData ? (
              <div className="ad-empty-state">
                <BarChart3 size={32} strokeWidth={1.5} />
                <p className="ad-empty-title">Chưa có dữ liệu doanh thu</p>
                <p className="ad-empty-desc">
                  Không ghi nhận đơn hàng hợp lệ (không hủy) trong kỳ và kỳ so sánh.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={310}>
                <LineChart
                  data={revenueSeries}
                  margin={{ top: 10, right: 16, left: 4, bottom: 4 }}
                >
                  <CartesianGrid stroke="#eef0f4" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11.5, fill: '#6b7280', fontFamily: 'Inter, sans-serif' }}
                    axisLine={{ stroke: '#e6e8ec' }}
                    tickLine={false}
                    interval="preserveStartEnd"
                    minTickGap={16}
                  />
                  <YAxis
                    tickFormatter={formatYAxisVND}
                    tick={{ fontSize: 11.5, fill: '#6b7280', fontFamily: 'Inter, sans-serif' }}
                    axisLine={false}
                    tickLine={false}
                    width={52}
                  />
                  <Tooltip content={<RevenueTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="previousRevenue"
                    name="Kỳ trước"
                    stroke="#9ca3af"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={{ r: 4, fill: '#9ca3af', stroke: '#ffffff', strokeWidth: 2 }}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="currentRevenue"
                    name="Kỳ này"
                    stroke="#1d53d4"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#1d53d4', strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#1d53d4', stroke: '#ffffff', strokeWidth: 2 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Cột phải: Donut cơ cấu doanh thu theo Danh mục */}
        <div className="aura-card ad-chart-card">
          <div className="ad-chart-header">
            <div>
              <h2 className="aura-card-title">Cơ cấu theo danh mục</h2>
              <p className="ad-chart-sub">Tối đa 5 danh mục cao nhất &amp; nhóm Khác</p>
            </div>
          </div>

          <div className="ad-chart-body ad-donut-body">
            {loading ? (
              <div className="ad-donut-skeleton">
                <div className="ad-skel ad-skel-circle" />
                <div className="ad-skel ad-skel-row" />
                <div className="ad-skel ad-skel-row" />
                <div className="ad-skel ad-skel-row" />
              </div>
            ) : categoryItems.length === 0 ? (
              <div className="ad-empty-state">
                <PieChartIcon size={32} strokeWidth={1.5} />
                <p className="ad-empty-title">Chưa có cơ cấu danh mục</p>
                <p className="ad-empty-desc">
                  Chưa phát sinh sản phẩm thuộc đơn hàng hợp lệ trong kỳ đang chọn.
                </p>
              </div>
            ) : (
              <>
                <div className="ad-donut-wrap">
                  <ResponsiveContainer width="100%" height={210}>
                    <PieChart>
                      <Pie
                        data={categoryItems}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={62}
                        outerRadius={88}
                        paddingAngle={categoryItems.length > 1 ? 2 : 0}
                        stroke="none"
                      >
                        {categoryItems.map((entry, idx) => (
                          <Cell
                            key={`${entry.categoryId}-${entry.name}`}
                            fill={
                              entry.name === 'Khác'
                                ? '#94a3b8'
                                : DONUT_COLORS[idx % DONUT_COLORS.length]
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<DonutTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="ad-donut-center">
                    <span className="ad-donut-center-label">Tổng tiền hàng</span>
                    <strong className="ad-donut-center-val">{formatVND(categoryTotal)}</strong>
                  </div>
                </div>

                <ul className="ad-donut-legend">
                  {categoryItems.map((item, idx) => {
                    const color =
                      item.name === 'Khác'
                        ? '#94a3b8'
                        : DONUT_COLORS[idx % DONUT_COLORS.length];
                    return (
                      <li key={`${item.categoryId}-${item.name}`} className="ad-donut-legend-item">
                        <span className="ad-donut-legend-left">
                          <span className="ad-donut-dot" style={{ backgroundColor: color }} />
                          <span className="ad-donut-name">{item.name}</span>
                        </span>
                        <span className="ad-donut-legend-right">
                          <span className="ad-donut-amount">{formatVND(item.value, true)}</span>
                          <span className="ad-donut-pct">{formatPercent(item.percentage)}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        </div>
      </section>
    </AdminLayout>
  );
}
