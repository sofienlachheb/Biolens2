import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Chart } from 'chart.js/auto'
import './App.css'

export default function App() {
  // UI state
  const [activeTab, setActiveTab] = useState('camera')
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false)
  const [isDemoMode, setIsDemoMode] = useState(false)

  // Media + chart refs
  const cameraStreamRef = useRef(null)
  const analysisIntervalRef = useRef(null)
  const demoIntervalRef = useRef(null)

  const videoRef = useRef(null)
  const skinVideoRef = useRef(null)

  const chartCanvasRef = useRef(null)
  const chartRef = useRef(null)

  // vitals state
  const [hr, setHr] = useState(null)
  const [rr, setRr] = useState(null)
  const [o2, setO2] = useState(null)
  const [hrStatus, setHrStatus] = useState('طبيعي')
  const [rrStatus, setRrStatus] = useState('طبيعي')

  const [dateStr, setDateStr] = useState('')
  const [timeStr, setTimeStr] = useState('')

  // skin analysis
  const [skinLoading, setSkinLoading] = useState(false)
  const [skinResults, setSkinResults] = useState(null) // {condition, hb, eyelid, confidence}
  const [skinWarning, setSkinWarning] = useState(false)

  // blood analysis
  const [bloodPreview, setBloodPreview] = useState(null)
  const [bloodLoading, setBloodLoading] = useState(false)
  const [bloodResults, setBloodResults] = useState(null) // {type, confidence, cellCount}

  // AI message
  const [aiMessage, setAiMessage] = useState(
    'مرحباً! أنا مساعدك الصحي الذكي. سأقوم بتحليل بياناتك الصحية وتقديم نصائح مخصصة لك بناءً على قراءاتك الحالية.'
  )

  // history chart data
  const [historyData, setHistoryData] = useState([]) // {hr, rr, o2, time}

  const watchStatusLabel = useMemo(() => {
    if (isDemoMode) return (<><span className="demo-badge">تجريبي</span> ساعة ذكية</>)
    return 'ساعة ذكية'
  }, [isDemoMode])

  // date/time updater
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setDateStr(now.toLocaleDateString('ar-QA'))
      setTimeStr(now.toLocaleTimeString('ar-QA'))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // chart updater
  useEffect(() => {
    if (!chartCanvasRef.current) return
    const ctx = chartCanvasRef.current.getContext('2d')
    if (!ctx) return

    // destroy old chart
    if (chartRef.current) {
      chartRef.current.destroy()
      chartRef.current = null
    }

    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: historyData.map(d => d.time),
        datasets: [
          {
            label: 'معدل النبض',
            data: historyData.map(d => d.hr),
            borderColor: '#667eea',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
          {
            label: 'معدل التنفس',
            data: historyData.map(d => d.rr),
            borderColor: '#764ba2',
            backgroundColor: 'rgba(118, 75, 162, 0.1)',
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              font: { size: 14, family: 'Cairo', weight: 'bold' },
              padding: 15,
            },
          },
        },
        scales: {
          y: { beginAtZero: false, grid: { color: '#e2e8f0' } },
          x: { grid: { color: '#e2e8f0' } },
        },
      },
    })

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
      }
    }
  }, [historyData])

  const updateStatuses = (nextHr, nextRr) => {
    setHrStatus(nextHr < 60 || nextHr > 100 ? 'غير طبيعي' : 'طبيعي')
    setRrStatus(nextRr < 12 || nextRr > 20 ? 'غير طبيعي' : 'طبيعي')
  }

  const pushHistory = (nextHr, nextRr, nextO2) => {
    const time = new Date().toLocaleTimeString('ar-QA', { hour: '2-digit', minute: '2-digit' })
    setHistoryData(prev => {
      const next = [...prev, { hr: nextHr, rr: nextRr, o2: nextO2, time }]
      return next.length > 15 ? next.slice(next.length - 15) : next
    })
  }

  const setVitals = (nextHr, nextRr, nextO2) => {
    setHr(nextHr)
    setRr(nextRr)
    setO2(nextO2)
    updateStatuses(nextHr, nextRr)
    pushHistory(nextHr, nextRr, nextO2)
  }

  const startAnalysis = () => {
    stopAnalysis()
    analysisIntervalRef.current = setInterval(() => {
      const nextHr = Math.floor(65 + Math.random() * 30)
      const nextRr = Math.floor(14 + Math.random() * 6)
      const nextO2 = Math.floor(96 + Math.random() * 4)
      setVitals(nextHr, nextRr, nextO2)
    }, 2500)
  }

  const stopAnalysis = () => {
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current)
      analysisIntervalRef.current = null
    }
  }

  const startDemoMode = () => {
    stopDemoMode()
    demoIntervalRef.current = setInterval(() => {
      const nextHr = Math.floor(65 + Math.random() * 30)
      const nextRr = Math.floor(14 + Math.random() * 6)
      const nextO2 = Math.floor(96 + Math.random() * 4)
      setVitals(nextHr, nextRr, nextO2)
    }, 3000)
  }

  const stopDemoMode = () => {
    if (demoIntervalRef.current) {
      clearInterval(demoIntervalRef.current)
      demoIntervalRef.current = null
    }
  }

  const startCamera = async () => {
    try {
      const constraints = {
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      cameraStreamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      startAnalysis()
    } catch (error) {
      let msg = 'لا يمكن الوصول إلى الكاميرا. '
      if (error?.name === 'NotAllowedError') msg += 'يرجى السماح بالوصول إلى الكاميرا من إعدادات المتصفح.'
      else if (error?.name === 'NotFoundError') msg += 'لم يتم العثور على كاميرا متصلة بالجهاز.'
      else if (error?.name === 'NotReadableError') msg += 'الكاميرا قيد الاستخدام من قبل تطبيق آخر.'
      else msg += `حدث خطأ غير متوقع: ${error?.message || error}`
      alert(msg)
      console.error(error)
    }
  }

  const stopCamera = () => {
    stopAnalysis()
    const stream = cameraStreamRef.current
    if (stream) {
      stream.getTracks().forEach(t => t.stop())
      cameraStreamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const connectRealDevice = async () => {
    try {
      // Web Bluetooth Heart Rate service
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }],
        optionalServices: ['battery_service'],
      })
      const server = await device.gatt.connect()
      const service = await server.getPrimaryService('heart_rate')
      const characteristic = await service.getCharacteristic('heart_rate_measurement')
      await characteristic.startNotifications()
      characteristic.addEventListener('characteristicvaluechanged', (event) => {
        const value = event.target.value
        const nextHr = value.getUint8(1)
        // Keep RR/O2 as last-known (or placeholders)
        const nextRr = rr ?? Math.floor(14 + Math.random() * 6)
        const nextO2 = o2 ?? Math.floor(96 + Math.random() * 4)
        setVitals(nextHr, nextRr, nextO2)
      })
      setIsDemoMode(false)
      setIsDeviceModalOpen(false)
      // stop demo if running
      stopDemoMode()
    } catch (err) {
      alert('لم يتم العثور على أجهزة متوافقة. يمكنك استخدام النظام التجريبي بدلاً من ذلك.')
      console.error(err)
    }
  }

  const enableDemo = () => {
    setIsDemoMode(true)
    setIsDeviceModalOpen(false)
    startDemoMode()
  }

  const analyzeSkin = () => {
    setSkinLoading(true)
    setSkinResults(null)
    setSkinWarning(false)
    setTimeout(() => {
      const conditions = ['طبيعي', 'فقر دم خفيف', 'إجهاد متوسط', 'شحوب طفيف']
      const condition = conditions[Math.floor(Math.random() * conditions.length)]
      const hb = +(11.5 + Math.random() * 4.5).toFixed(1)
      const confidence = +(87 + Math.random() * 10).toFixed(1)
      const eyelid = hb < 13 ? 'شاحب' : 'طبيعي'
      setSkinResults({ condition, hb, eyelid, confidence })
      setSkinWarning(condition !== 'طبيعي')
      setSkinLoading(false)
    }, 2500)
  }

  const analyzeBlood = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setBloodPreview(reader.result)
      setBloodLoading(true)
      setBloodResults(null)
      setTimeout(() => {
        const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
        const type = bloodTypes[Math.floor(Math.random() * bloodTypes.length)]
        const confidence = +(90 + Math.random() * 9).toFixed(1)
        const cellCount = Math.floor(4200000 + Math.random() * 1800000)
        setBloodResults({ type, confidence, cellCount })
        setBloodLoading(false)
      }, 3500)
    }
    reader.readAsDataURL(file)
  }

  const generateAIAnalysis = () => {
    const messages = [
      'بناءً على تحليل بياناتك الصحية، لاحظت أن معدل نبضك مستقر ضمن المعدل الطبيعي. أنصحك بالاستمرار في ممارسة الرياضة بانتظام للحفاظ على هذا المستوى الصحي الممتاز! 💪',
      'تحليلي لأنماط نومك وقياساتك الحيوية يشير إلى أنك تحصل على راحة جيدة. حافظ على روتين نومك المنتظم للحصول على أفضل النتائج! 😴',
      'ملاحظة مهمة: قد يكون من المفيد زيادة تناول الأطعمة الغنية بالحديد مثل السبانخ والعدس لتحسين مستوى الهيموجلوبين. 🥗',
      'بياناتك الصحية تظهر تحسناً ملحوظاً خلال الأسبوع الماضي! استمر على هذا النهج الصحي! 🎉',
    ]
    setAiMessage(messages[Math.floor(Math.random() * messages.length)])
  }

  const getRecommendations = () => {
    const recommendations = [
      'توصية ذكية: جرب تمارين التنفس العميق لمدة 10 دقائق يومياً لتحسين معدل التنفس وتقليل التوتر. 🧘',
      'نصيحة صحية: تناول وجبة خفيفة غنية بالبروتين قبل التمرين لتحسين الأداء البدني. 🏋️',
      'تذكير صحي: لم تشرب كمية كافية من الماء اليوم! اشرب كوبين من الماء الآن. 💧',
      'توصية غذائية: أضف المزيد من الفواكه والخضروات الملونة إلى نظامك الغذائي لتعزيز المناعة. 🍎🥦',
    ]
    setAiMessage(recommendations[Math.floor(Math.random() * recommendations.length)])
  }

  // cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera()
      stopDemoMode()
      stopAnalysis()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isCameraRunning = !!cameraStreamRef.current

  return (
    <div className="app-container">
      {/* Header */}
      <div className="header">
        <div className="header-content">
          <h1>🔬 BioLens Pro</h1>
          <p>نظام الكشف الصحي الذكي المتقدم - تحليل شامل بتقنية AI</p>
        </div>

        <div className="device-status">
          <button className="device-btn" onClick={() => setIsDeviceModalOpen(true)}>
            <div className={`device-indicator ${isDemoMode ? 'connected' : ''}`} id="watch-indicator"></div>
            <span id="watch-status">{watchStatusLabel}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'camera' ? 'active' : ''}`} onClick={() => setActiveTab('camera')}>
          <span className="tab-icon">📹</span>
          <span>فحص الوجه</span>
        </button>
        <button className={`tab ${activeTab === 'skin' ? 'active' : ''}`} onClick={() => setActiveTab('skin')}>
          <span className="tab-icon">👁️</span>
          <span>تحليل الجلد</span>
        </button>
        <button className={`tab ${activeTab === 'blood' ? 'active' : ''}`} onClick={() => setActiveTab('blood')}>
          <span className="tab-icon">🩸</span>
          <span>فحص الدم</span>
        </button>
        <button className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
          <span className="tab-icon">📊</span>
          <span>السجل الطبي</span>
        </button>
        <button className={`tab ${activeTab === 'ai' ? 'active' : ''}`} onClick={() => setActiveTab('ai')}>
          <span className="tab-icon">🤖</span>
          <span>الذكاء الاصطناعي</span>
        </button>
      </div>

      {/* Camera Tab */}
      <div id="camera-tab" className={`tab-content ${activeTab === 'camera' ? 'active' : ''}`}>
        <div className="main-grid">
          <div className="card">
            <div className="card-header">
              <span className="card-icon">📹</span>
              <h2>كاميرا الفحص المباشر</h2>
            </div>

            <div className="video-container">
              <video id="video" ref={videoRef} autoPlay playsInline style={{ display: isCameraRunning ? 'block' : 'none' }} />
              <div id="video-placeholder" className="video-placeholder" style={{ display: isCameraRunning ? 'none' : 'block' }}>
                <div className="video-placeholder-icon">📷</div>
                <p>اضغط على "تشغيل الكاميرا" للبدء</p>
              </div>
            </div>

            <div className="camera-controls">
              {!isCameraRunning ? (
                <button id="start-camera" className="btn btn-primary" onClick={startCamera}>
                  ▶️ تشغيل الكاميرا
                </button>
              ) : (
                <button id="stop-camera" className="btn btn-danger" onClick={stopCamera}>
                  ⏹️ إيقاف الكاميرا
                </button>
              )}
            </div>

            <div id="camera-alert" className={`alert alert-info ${isCameraRunning ? '' : 'hidden'}`}>
              <span>⚡</span>
              <span>جاري التحليل المباشر للعلامات الحيوية...</span>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-icon">❤️</span>
              <h2>العلامات الحيوية المباشرة</h2>
            </div>

            <div style={{ display: 'grid', gap: 20 }}>
              <div className="vital-sign">
                <div className="vital-label">❤️ معدل نبضات القلب</div>
                <div className="vital-value">
                  <span id="heart-rate">{hr ?? '--'}</span>
                </div>
                <div className="vital-unit">نبضة/دقيقة</div>
                <span id="heart-status" className={`status-indicator ${hrStatus === 'طبيعي' ? 'status-normal' : 'status-warning'}`}>
                  {hrStatus}
                </span>
              </div>

              <div className="vital-sign">
                <div className="vital-label">🫁 معدل التنفس</div>
                <div className="vital-value">
                  <span id="resp-rate">{rr ?? '--'}</span>
                </div>
                <div className="vital-unit">نفس/دقيقة</div>
                <span id="resp-status" className={`status-indicator ${rrStatus === 'طبيعي' ? 'status-normal' : 'status-warning'}`}>
                  {rrStatus}
                </span>
              </div>

              <div className="vital-sign">
                <div className="vital-label">💨 نسبة الأكسجين</div>
                <div className="vital-value">
                  <span id="oxygen">{o2 ?? '--'}</span>
                </div>
                <div className="vital-unit">%</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-icon">📈</span>
            <h2>رسم بياني للعلامات الحيوية</h2>
          </div>
          <div className="chart-container">
            <canvas id="vitals-chart" ref={chartCanvasRef}></canvas>
          </div>
        </div>
      </div>

      {/* Skin Tab */}
      <div id="skin-tab" className={`tab-content ${activeTab === 'skin' ? 'active' : ''}`}>
        <div className="main-grid">
          <div className="card">
            <div className="card-header">
              <span className="card-icon">👁️</span>
              <h2>تحليل الجلد وكشف فقر الدم</h2>
            </div>

            <div className="video-container">
              <video id="skin-video" ref={skinVideoRef} autoPlay playsInline />
              <div id="skin-placeholder" className="video-placeholder">
                <div className="video-placeholder-icon">👁️</div>
                <p>ضع إصبعك على العدسة</p>
              </div>
            </div>

            <div className="camera-controls">
              <button className="btn btn-primary" onClick={analyzeSkin}>
                🔍 تحليل الجلد
              </button>
            </div>

            {skinLoading && (
              <div id="skin-loading" className="loading">
                <div className="spinner"></div>
                <p>جاري تحليل لون الجلد والجفون...</p>
              </div>
            )}

            {!skinLoading && !skinResults && (
              <div id="skin-no-results" className="alert alert-info">
                <span>ℹ️</span>
                <span>ضع إصبعك على الكاميرا واضغط على "تحليل الجلد"</span>
              </div>
            )}

            {!skinLoading && skinWarning && (
              <div id="skin-warning" className="alert alert-warning">
                <span>⚠️</span>
                <span>تم اكتشاف علامات محتملة لفقر الدم، يُنصح بمراجعة الطبيب</span>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-icon">📋</span>
              <h2>نتائج التحليل</h2>
            </div>

            {skinResults ? (
              <div id="skin-results" className="result-grid">
                <div className="result-item">
                  <span className="result-label">حالة الجلد</span>
                  <span className="result-value" id="skin-condition">{skinResults.condition}</span>
                </div>
                <div className="result-item">
                  <span className="result-label">مستوى الهيموجلوبين</span>
                  <span className="result-value" id="hemoglobin">{skinResults.hb} g/dL</span>
                </div>
                <div className="result-item">
                  <span className="result-label">لون الجفون</span>
                  <span className="result-value" id="eyelid-color">{skinResults.eyelid}</span>
                </div>
                <div className="result-item">
                  <span className="result-label">دقة التحليل</span>
                  <span className="result-value" id="skin-confidence">{skinResults.confidence}%</span>
                </div>
              </div>
            ) : (
              <div className="alert alert-info">
                <span>ℹ️</span>
                <span>لا توجد نتائج بعد</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Blood Tab */}
      <div id="blood-tab" className={`tab-content ${activeTab === 'blood' ? 'active' : ''}`}>
        <div className="main-grid">
          <div className="card">
            <div className="card-header">
              <span className="card-icon">🩸</span>
              <h2>فحص فصيلة الدم</h2>
            </div>

            <label htmlFor="blood-upload" className="file-upload">
              <div className="upload-icon">📤</div>
              <h3>ارفع صورة قطرة الدم</h3>
              <p style={{ color: '#94a3b8', marginTop: 8 }}>JPG, PNG (الحد الأقصى: 5MB)</p>
              <input
                type="file"
                id="blood-upload"
                accept="image/*"
                onChange={(e) => analyzeBlood(e.target.files?.[0])}
              />
            </label>

            {bloodPreview && <img id="blood-preview" className="image-preview" src={bloodPreview} alt="blood preview" />}

            {bloodLoading && (
              <div id="blood-loading" className="loading">
                <div className="spinner"></div>
                <p>جاري تحليل عينة الدم بتقنية التعلم العميق...</p>
              </div>
            )}

            {!bloodLoading && !bloodResults && (
              <div id="blood-no-results" className="alert alert-info">
                <span>ℹ️</span>
                <span>ارفع صورة قطرة الدم لبدء التحليل</span>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-icon">🔬</span>
              <h2>نتائج الفحص</h2>
            </div>

            {bloodResults ? (
              <div id="blood-results" className="result-grid">
                <div
                  className="result-item"
                  style={{
                    background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                    borderRightColor: '#ef4444',
                  }}
                >
                  <span className="result-label">فصيلة الدم</span>
                  <span className="result-value" id="blood-type-text" style={{ color: '#991b1b', fontSize: '2em' }}>
                    {bloodResults.type}
                  </span>
                </div>
                <div className="result-item">
                  <span className="result-label">دقة الكشف</span>
                  <span className="result-value" id="blood-confidence">{bloodResults.confidence}%</span>
                </div>
                <div className="result-item">
                  <span className="result-label">عدد كريات الدم</span>
                  <span className="result-value" id="cell-count">{bloodResults.cellCount.toLocaleString('ar-QA')}</span>
                </div>
                <div className="result-item">
                  <span className="result-label">نوع الدم</span>
                  <span className="result-value" id="blood-type">{bloodResults.type}</span>
                </div>
              </div>
            ) : (
              <div className="alert alert-info">
                <span>ℹ️</span>
                <span>لا توجد نتائج بعد</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History Tab */}
      <div id="history-tab" className={`tab-content ${activeTab === 'history' ? 'active' : ''}`}>
        <div className="card">
          <div className="card-header">
            <span className="card-icon">📊</span>
            <h2>التقرير الطبي الشامل</h2>
          </div>

          <div className="report-section">
            <div className="report-title">📋 ملخص الحالة الصحية</div>
            <div className="report-content">
              <p><strong>التاريخ:</strong> <span id="report-date">{dateStr}</span></p>
              <p><strong>الوقت:</strong> <span id="report-time">{timeStr}</span></p>
            </div>
          </div>

          <div className="report-section">
            <div className="report-title">❤️ العلامات الحيوية</div>
            <div className="report-content">
              <p><strong>معدل نبضات القلب:</strong> <span id="report-hr">{hr ?? '--'}</span> نبضة/دقيقة</p>
              <p><strong>معدل التنفس:</strong> <span id="report-rr">{rr ?? '--'}</span> نفس/دقيقة</p>
              <p><strong>نسبة الأكسجين:</strong> <span id="report-o2">{o2 ?? '--'}</span>%</p>
            </div>
          </div>

          <div className="report-section">
            <div className="report-title">🩸 نتائج التحاليل</div>
            <div className="report-content">
              <p><strong>فصيلة الدم:</strong> <span id="report-blood">{bloodResults?.type ?? 'غير محدد'}</span></p>
              <p><strong>مستوى الهيموجلوبين:</strong> <span id="report-hb">{skinResults ? `${skinResults.hb} g/dL` : 'غير محدد'}</span></p>
              <p><strong>حالة الجلد:</strong> <span id="report-skin">{skinResults?.condition ?? 'غير محدد'}</span></p>
            </div>
          </div>

          <button className="btn btn-primary" onClick={() => window.print()} style={{ marginTop: 20 }}>
            🖨️ طباعة التقرير
          </button>
        </div>
      </div>

      {/* AI Tab */}
      <div id="ai-tab" className={`tab-content ${activeTab === 'ai' ? 'active' : ''}`}>
        <div className="card">
          <div className="card-header">
            <span className="card-icon">🤖</span>
            <h2>المساعد الذكي الصحي</h2>
          </div>

          <div className="ai-message">
            <p id="ai-message">{aiMessage}</p>
          </div>

          <div className="camera-controls" style={{ marginTop: 25 }}>
            <button className="btn btn-primary" onClick={generateAIAnalysis}>
              🔍 تحليل ذكي شامل
            </button>
            <button className="btn btn-success" onClick={getRecommendations}>
              💡 احصل على توصيات
            </button>
          </div>
        </div>
      </div>

      {/* Device Modal */}
      <div id="device-modal" className="modal" style={{ display: isDeviceModalOpen ? 'block' : 'none' }} onClick={(e) => {
        if (e.target?.id === 'device-modal') setIsDeviceModalOpen(false)
      }}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <span className="close" onClick={() => setIsDeviceModalOpen(false)}>&times;</span>
          <div className="modal-header">
            <h2>اختر طريقة الاتصال</h2>
          </div>
          <div className="device-option" onClick={connectRealDevice}>
            <h3>⌚ الاتصال بساعة ذكية حقيقية</h3>
            <p>قم بتوصيل ساعتك الذكية عبر البلوتوث للحصول على بيانات حقيقية</p>
          </div>
          <div className="device-option" onClick={enableDemo}>
            <h3>🎮 تفعيل النظام التجريبي</h3>
            <p>استخدم بيانات تجريبية لتجربة النظام دون الحاجة لساعة ذكية</p>
          </div>
        </div>
      </div>
    </div>
  )
}
