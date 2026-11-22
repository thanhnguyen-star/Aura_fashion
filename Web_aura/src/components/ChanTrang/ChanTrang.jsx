import './ChanTrang.css'

export default function ChanTrang() {
  const xuLyDangKy = (suKien) => {
    suKien.preventDefault()
  }

  return (
    <footer className="chan-trang">
      <div className="khung-noi-dung luoi-chan-trang">
        <div>
          <a className="logo-chan-trang" href="#trang-chu">
            AURA
          </a>

          <p>
            Thời trang tối giản và nghệ thuật cá nhân hóa dành cho
            thế hệ mới.
          </p>
        </div>

        <div>
          <h3>Khám phá</h3>
          <a href="#danh-muc">Danh mục</a>
          <a href="#san-pham">Sản phẩm mới</a>
          <a href="#ca-nhan-hoa">Cá nhân hóa</a>
        </div>

        <div>
          <h3>Hỗ trợ</h3>
          <a href="#trang-chu">Hướng dẫn mua hàng</a>
          <a href="#trang-chu">Chính sách đổi trả</a>
          <a href="#trang-chu">Liên hệ</a>
        </div>

        <div>
          <h3>Nhận tin từ AURA</h3>

          <p>
            Ưu đãi và bộ sưu tập mới sẽ được gửi đến bạn.
          </p>

          <form onSubmit={xuLyDangKy}>
            <input
              type="email"
              placeholder="Email của bạn"
              aria-label="Email của bạn"
              required
            />
            <button type="submit">Đăng ký</button>
          </form>
        </div>
      </div>

      <div className="khung-noi-dung ban-quyen">
        <span>© 2026 AURA Fashion</span>
        <span>Facebook · Instagram · TikTok</span>
      </div>
    </footer>
  )
}