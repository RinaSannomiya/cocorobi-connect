import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle } from 'lucide-react';
import EmailRegistration from './EmailRegistration';

const LandingPage = () => {
  const navigate = useNavigate();

  // スクロール関数の実装（重複ID問題解決 + scrollIntoView方式）
  const scrollToSignupForm = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    console.log('ボタンクリック:', window.innerWidth);
    
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
      // スマホ版専用の要素を取得
      const element = document.getElementById('signup-form-mobile');
      
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest'
        });
        console.log('スマホ版: scrollIntoView実行');
      } else {
        console.log('signup-form-mobile要素が見つかりません');
      }
    } else {
      // PC版: 最上部にスクロール
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
      console.log('PC版: 最上部スクロール');
    }
  };

  // ログインページへの遷移関数
  const handleLoginClick = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-white pt-16" style={{ scrollBehavior: 'smooth' }}>
      {/* Hero Section with New Design */}
      <div className="w-full bg-gray-50">
        <div className="max-w-7xl mx-auto">
          {/* PC版: 左右2カラムレイアウト */}
          <div className="hidden lg:flex items-stretch justify-between min-h-screen">
            {/* Left Side - Hero Content (65%) */}
            <div className="w-[65%] flex items-center justify-center py-8 px-8">
              <div className="w-full h-full flex flex-col items-center justify-center text-center">
                {/* メインテキスト - 64px程度のサイズ、font-mediumで細く */}
                <div className="mb-6 z-10 w-full px-2">
                  <h1 className="text-[64px] font-medium mb-4 leading-[0.9] whitespace-nowrap" style={{ color: '#00142E' }}>
                    応援が
                    <span 
                      className="bg-gradient-to-r from-[#1D73C3] to-[#00736d] bg-clip-text text-transparent"
                    >
                      副収入
                    </span>
                    に変わる
                  </h1>
                  <h2 className="text-[64px] font-medium leading-[0.9] whitespace-nowrap" style={{ color: '#00142E' }}>
                    新しい紹介のカタチ
                  </h2>
                </div>

                {/* Cocoroobiロゴ */}
                <div className="mb-3 z-10">
                  <img 
                    src="/logo.png" 
                    alt="Cocorobi 紹介AIエージェント"
                    className="w-80 h-auto object-contain"
                  />
                </div>

                {/* ノートパソコン画面 - 75%サイズ、上下余白を今の半分に */}
                <div className="relative z-10 mb-3">
                  <img 
                    src="/PC2.png" 
                    alt="サポーターダッシュボード画面"
                    className="w-3/4 max-w-xl h-auto object-contain mx-auto"
                  />
                </div>
              </div>
            </div>

            {/* Right Side - Registration Form (35%) - PC版専用ID */}
            <div className="w-[35%] min-h-screen">
              <div id="signup-form-pc" className="bg-white p-8 h-full flex flex-col justify-start pt-16 scroll-mt-20 shadow-lg">
                <div className="mb-8 text-center">
                  <div style={{ color: '#00142E' }}>
                    <div className="text-2xl font-bold">サポーター登録</div>
                    <div className="text-lg font-bold">はこちらから</div>
                  </div>
                </div>
                {/* PC版専用のEmailRegistrationコンポーネント */}
                <div>
                  <div className="space-y-8">
                    <div className="space-y-6">
                      {/* Email Field - PC版専用ID */}
                      <div>
                        <label htmlFor="email-pc" className="block text-sm font-medium text-gray-700 mb-2">
                          メールアドレス <span className="text-red-500">*</span>
                        </label>
                        <div className="mt-1 relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                            </svg>
                          </div>
                          <input
                            id="email-pc"
                            name="email"
                            type="email"
                            autoComplete="email"
                            className="appearance-none rounded-md relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1D73C3] focus:border-[#1D73C3] sm:text-sm"
                            placeholder="example@email.com"
                          />
                        </div>
                      </div>

                      {/* Privacy Policy Agreement - PC版専用ID */}
                      <div>
                        <div className="flex items-start">
                          <div className="flex items-center h-5">
                            <input
                              id="privacy-agreement-pc"
                              name="privacy-agreement"
                              type="checkbox"
                              className="h-4 w-4 text-[#1D73C3] focus:ring-[#1D73C3] border-gray-300 rounded"
                            />
                          </div>
                          <div className="ml-3 text-sm">
                            <label htmlFor="privacy-agreement-pc" className="text-gray-700">
                              <a 
                                href="https://cocorobi.co.jp/privacy-policy" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-[#1D73C3] hover:text-[#155a9a] underline"
                              >
                                プライバシーポリシー
                              </a>
                              に同意します <span className="text-red-500">*</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-center">
                      <button
                        type="submit"
                        className="inline-flex justify-center py-3 px-8 border border-transparent text-base font-medium rounded-full text-white bg-[#00736d] hover:bg-[#00736d]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00736d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                      >
                        サポーター登録する
                      </button>
                    </div>

                    <div className="text-center">
                      <p className="text-sm text-gray-600">
                        既にアカウントをお持ちの方は{' '}
                        <button
                          type="button"
                          onClick={handleLoginClick}
                          className="font-medium text-[#1D73C3] hover:text-[#155a9a] transition-colors duration-200"
                        >
                          ログイン
                        </button>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* スマホ版: 縦並びレイアウト */}
          <div className="lg:hidden">
            {/* Hero Content - ファーストビュー */}
            <div className="w-full min-h-screen flex flex-col items-center justify-center px-2 py-8">
              {/* メインテキスト - スマホ版のサイズを80%に縮小 */}
              <div className="mb-4 text-center z-10 w-full">
                <h1 className="text-[34px] sm:text-[38px] md:text-[45px] font-medium mb-3 leading-[0.9] whitespace-nowrap" style={{ color: '#00142E' }}>
                  応援が
                  <span 
                    className="bg-gradient-to-r from-[#1D73C3] to-[#00736d] bg-clip-text text-transparent"
                  >
                    副収入
                  </span>
                  に変わる
                </h1>
                <h2 className="text-[34px] sm:text-[38px] md:text-[45px] font-medium leading-[0.9] whitespace-nowrap" style={{ color: '#00142E' }}>
                  新しい紹介のカタチ
                </h2>
              </div>

              {/* Cocoroobiロゴ */}
              <div className="mb-3 z-10">
                <img 
                  src="/logo.png" 
                  alt="Cocorobi 紹介AIエージェント"
                  className="w-64 h-auto object-contain"
                />
              </div>

              {/* ノートパソコン画面 - 75%サイズ、上下余白を詰める */}
              <div className="relative z-10 w-full max-w-sm mb-3">
                <img 
                  src="/PC2.png" 
                  alt="サポーターダッシュボード画面"
                  className="w-3/4 h-auto object-contain mx-auto"
                />
              </div>
            </div>

            {/* Registration Form - スマホ版専用ID */}
            <div className="w-full" style={{ backgroundColor: '#1D73C3' }}>
              <div className="p-6">
                <div id="signup-form-mobile" className="bg-white rounded-lg p-6 shadow-lg scroll-mt-20">
                  <div className="mb-6 text-center">
                    <div style={{ color: '#00142E' }}>
                      <div className="text-xl font-bold">サポーター登録</div>
                      <div className="text-lg font-bold">はこちらから</div>
                    </div>
                  </div>
                  {/* スマホ版専用のEmailRegistrationコンポーネント */}
                  <div>
                    <div className="space-y-6">
                      <div className="space-y-4">
                        {/* Email Field - スマホ版専用ID */}
                        <div>
                          <label htmlFor="email-mobile" className="block text-sm font-medium text-gray-700">
                            メールアドレス <span className="text-red-500">*</span>
                          </label>
                          <div className="mt-1 relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                              </svg>
                            </div>
                            <input
                              id="email-mobile"
                              name="email"
                              type="email"
                              autoComplete="email"
                              className="appearance-none rounded-md relative block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1D73C3] focus:border-[#1D73C3] sm:text-sm"
                              placeholder="example@email.com"
                            />
                          </div>
                        </div>

                        {/* Privacy Policy Agreement - スマホ版専用ID */}
                        <div>
                          <div className="flex items-start">
                            <div className="flex items-center h-5">
                              <input
                                id="privacy-agreement-mobile"
                                name="privacy-agreement"
                                type="checkbox"
                                className="h-4 w-4 text-[#1D73C3] focus:ring-[#1D73C3] border-gray-300 rounded"
                              />
                            </div>
                            <div className="ml-3 text-sm">
                              <label htmlFor="privacy-agreement-mobile" className="text-gray-700">
                                <a 
                                  href="https://cocorobi.co.jp/privacy-policy" 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-[#1D73C3] hover:text-[#155a9a] underline"
                                >
                                  プライバシーポリシー
                                </a>
                                に同意します <span className="text-red-500">*</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-center">
                        <button
                          type="submit"
                          className="inline-flex justify-center py-3 px-8 border border-transparent text-base font-medium rounded-full text-white bg-[#00736d] hover:bg-[#00736d]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00736d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                        >
                          サポーター登録する
                        </button>
                      </div>

                      <div className="text-center">
                        <p className="text-sm text-gray-600">
                          既にアカウントをお持ちの方は{' '}
                          <button
                            type="button"
                            onClick={handleLoginClick}
                            className="font-medium text-[#1D73C3] hover:text-[#155a9a] transition-colors duration-200"
                          >
                            ログイン
                          </button>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Points Section */}
      <div 
        className="py-20 px-4 sm:px-6 lg:px-8"
        style={{ backgroundColor: '#e5eff5' }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4" style={{ color: '#00142E' }}>
              Cocorobi 紹介DXの安心ポイント
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {/* Point 01 - 厳選企業 */}
            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="flex flex-col items-center mb-6">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg mb-4"
                  style={{ backgroundColor: '#1D73C3' }}
                >
                  01
                </div>
                {/* 厳選企業のイラスト */}
                <div className="mb-4">
                  <img 
                    src="/gensenkigyo.png" 
                    alt="厳選企業のイラスト - クリップボード、ビル群、人物、5%バッジ"
                    className="w-32 h-32 object-contain"
                  />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-4 text-center" style={{ color: '#00142E' }}>
                厳選企業のみを紹介候補として掲載
              </h3>
              <p className="text-gray-700 leading-relaxed text-center">
                通過率5％以下の高ハードル審査を通過した厳選企業のみなので<br />
                自分のつながり先に安心して紹介できます。
              </p>
            </div>

            {/* Point 02 - 完全手間ゼロ */}
            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="flex flex-col items-center mb-6">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg mb-4"
                  style={{ backgroundColor: '#1D73C3' }}
                >
                  02
                </div>
                {/* AIのイラスト */}
                <div className="mb-4">
                  <img 
                    src="/AI.png" 
                    alt="AIロボットのイラスト - 中央にAIロボット、周りにメール・握手・カレンダー等のアイコン"
                    className="w-32 h-32 object-contain"
                  />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-4 text-center" style={{ color: '#00142E' }}>
                完全手間ゼロ
              </h3>
              <p className="text-gray-700 leading-relaxed text-center">
                日程調整や交渉など、紹介にかかるすべての手間は<br />
                専属秘書と紹介AIエージェントが代行します。
              </p>
            </div>

            {/* Point 03 - 継続報酬 */}
            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="flex flex-col items-center mb-6">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg mb-4"
                  style={{ backgroundColor: '#1D73C3' }}
                >
                  03
                </div>
                {/* 継続報酬のイラスト */}
                <div className="mb-4">
                  <img 
                    src="/keizokuhoushu.png" 
                    alt="継続報酬のイラスト - 上昇グラフとコイン（右上がりの矢印付き）"
                    className="w-32 h-32 object-contain"
                  />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-4 text-center" style={{ color: '#00142E' }}>
                成約後は継続報酬のみ
              </h3>
              <p className="text-gray-700 leading-relaxed text-center">
                初回成約後は、継続する限り毎月報酬が発生。<br />
                複数の成約が積み重なることで、継続的かつ安定した報酬に。
              </p>
            </div>
          </div>

          {/* CTA Button 2 */}
          <div className="text-center">
            <button 
              onClick={scrollToSignupForm}
              className="inline-flex items-center px-8 py-4 text-lg font-semibold rounded-full transition-all duration-300 hover:scale-105 hover:shadow-lg text-white"
              style={{ backgroundColor: '#1D73C3' }}
            >
              無料でサポーター登録する
            </button>
          </div>
        </div>
      </div>

      {/* Steps Section */}
      <div className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4" style={{ color: '#00142E' }}>
              利用ステップ
            </h2>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between space-y-8 md:space-y-0 md:space-x-8 mb-12">
            {/* Step 1 */}
            <div className="flex-1 text-center group">
              <div className="relative mb-6">
                <div 
                  className="w-24 h-16 rounded-lg flex items-center justify-center text-black font-bold text-lg mx-auto mb-4"
                  style={{ backgroundColor: '#ffdc00', color: '#00142E' }}
                >
                  STEP1
                </div>
                {/* QRコード読み込みのイラスト */}
                <div className="mb-4">
                  <img 
                    src="/QRyomikomi.png" 
                    alt="QRコード読み込みのイラスト - スマートフォンでQRコードをスキャンする人物"
                    className="w-28 h-28 mx-auto object-contain transition-transform duration-300 group-hover:scale-110"
                  />
                </div>
              </div>
              <p className="text-gray-700 leading-relaxed">
                QRコードを読み込み、名刺・SNSのデータを共有
              </p>
            </div>

            {/* Arrow 1 */}
            <div className="hidden md:block">
              <ArrowRight className="w-8 h-8" style={{ color: '#1D73C3' }} />
            </div>

            {/* Step 2 */}
            <div className="flex-1 text-center group">
              <div className="relative mb-6">
                <div 
                  className="w-24 h-16 rounded-lg flex items-center justify-center text-black font-bold text-lg mx-auto mb-4"
                  style={{ backgroundColor: '#ffdc00', color: '#00142E' }}
                >
                  STEP2
                </div>
                {/* AI紹介のイラスト */}
                <div className="mb-4">
                  <img 
                    src="/shokai_AI.png" 
                    alt="AI紹介のイラスト - ノートパソコンから黄色い封筒（メール）が飛び出す"
                    className="w-28 h-28 mx-auto object-contain transition-transform duration-300 group-hover:scale-110"
                  />
                </div>
              </div>
              <p className="text-gray-700 leading-relaxed">
                特許取得済みの独自AIが紹介のストレスをゼロに
              </p>
            </div>

            {/* Arrow 2 */}
            <div className="hidden md:block">
              <ArrowRight className="w-8 h-8" style={{ color: '#1D73C3' }} />
            </div>

            {/* Step 3 */}
            <div className="flex-1 text-center group">
              <div className="relative mb-6">
                <div 
                  className="w-24 h-16 rounded-lg flex items-center justify-center text-black font-bold text-lg mx-auto mb-4"
                  style={{ backgroundColor: '#ffdc00', color: '#00142E' }}
                >
                  STEP3
                </div>
                {/* 報酬のイラスト */}
                <div className="mb-4">
                  <img 
                    src="/hoshu.png" 
                    alt="報酬のイラスト - 青い紙幣と黄色いコインが積み重なった（$マーク付き）"
                    className="w-28 h-28 mx-auto object-contain transition-transform duration-300 group-hover:scale-110"
                  />
                </div>
              </div>
              <p className="text-gray-700 leading-relaxed">
                契約が決まればあなたに継続的に報酬が入金
              </p>
            </div>
          </div>

          {/* CTA Button 3 */}
          <div className="text-center">
            <button 
              onClick={scrollToSignupForm}
              className="inline-flex items-center px-8 py-4 text-lg font-semibold rounded-full transition-all duration-300 hover:scale-105 hover:shadow-lg text-white"
              style={{ backgroundColor: '#1D73C3' }}
            >
              無料でサポーター登録する
            </button>
          </div>
        </div>
      </div>

      {/* Q&A Section - グラデーション背景に変更 */}
      <div className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-[#1D73C3] to-[#00736d]">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl p-12 shadow-xl">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-8" style={{ color: '#00142E' }}>
                Q. 登録にお金はかからないの？
              </h2>
              
              {/* 疑問を持つ人のイラスト - テキストの下に移動 */}
              <div className="mb-6">
                <img 
                  src="/Q&A.png" 
                  alt="疑問を持つ人のイラスト - 黄色いノートパソコンを使って作業している人物、デスクに座り考えている様子、観葉植物やコーヒーカップなどリラックスした作業環境"
                  className="w-36 h-36 mx-auto object-contain"
                />
              </div>
              
              <div className="text-left max-w-3xl mx-auto">
                <p className="text-lg mb-6" style={{ color: '#00142E' }}>
                  <strong>A.</strong> もちろん登録も紹介AIの利用も
                  <span 
                    className="px-3 py-1 rounded-lg font-bold text-black mx-2"
                    style={{ backgroundColor: '#ffdc00' }}
                  >
                    完全無料
                  </span>
                  です！
                </p>
                
                <p className="text-lg text-gray-700 leading-relaxed mb-8">
                  むしろあなたのつながりを活用して、紹介から契約が決まるたびに報酬をお渡しします！
                </p>
              </div>

              <div className="mb-8 flex justify-center">
                <div className="flex items-center space-x-4">
                  <CheckCircle className="w-8 h-8" style={{ color: '#00736d' }} />
                  <span className="text-xl font-semibold" style={{ color: '#00142E' }}>
                    登録無料・利用無料・報酬あり
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section - 同じグラデーション背景で統一 */}
      <div className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-[#1D73C3] to-[#00736d]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            今すぐサポーター登録して、紹介で副収入を始めよう
          </h2>
          <p className="text-xl text-white/90 mb-8">
            あなたのつながりが、誰かの挑戦を支える力になります
          </p>
          <button 
            onClick={scrollToSignupForm}
            className="inline-flex items-center px-8 py-4 text-lg font-semibold rounded-full transition-all duration-300 hover:scale-105 hover:shadow-lg"
            style={{ 
              backgroundColor: '#ffdc00', 
              color: '#00142E',
            }}
          >
            無料でサポーター登録する
          </button>
          
          {/* Cocorobi Logo */}
          <div className="mt-8 mb-4">
            <img 
              src="/logo_white.png" 
              alt="Cocorobi ロゴ"
              className="w-48 h-auto mx-auto object-contain"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;