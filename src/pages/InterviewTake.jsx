/**
 * InterviewTake.jsx — Public interview recording page
 *
 * Recipients open this from email invite link:
 *   {APP_URL}/interview-take/{uniqueId}
 *
 * Flow:
 *   1) Landing screen — show interview details, "Start" button
 *   2) Recording screen — for each question: view → record → submit → next
 *   3) Success screen — when all questions done
 */

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  RiVideoLine, RiMicLine, RiCheckboxCircleLine, RiAlertLine,
  RiTimerLine, RiPlayCircleLine, RiStopCircleLine, RiSendPlaneLine,
} from 'react-icons/ri';
import './InterviewTake.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

export default function InterviewTake() {
  const { uniqueId } = useParams();

  // ── Page state ──────────────────────────────────────────────
  const [stage, setStage]   = useState('loading');   // loading | landing | recording | submitting | done | error
  const [data,  setData]    = useState(null);        // invite + interview + questions
  const [error, setError]   = useState('');

  // ── Recording state ─────────────────────────────────────────
  const [qIndex,    setQIndex]    = useState(0);
  const [phase,     setPhase]     = useState('view'); // view | recording | uploading
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [stream,    setStream]    = useState(null);

  const videoRef    = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef   = useRef([]);
  const timerRef    = useRef(null);

  // ═══════════════════════════════════════════════════════════
  // Load invite details on mount
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    fetch(`${API_BASE}/interview-take/${uniqueId}`)
      .then(r => r.json())
      .then(res => {
        if (res.code === 1) {
          setData(res.data);
          setStage('landing');
        } else if (res.code === 2) {
          setStage('done');
          setData({ alreadyDone: true, completedOn: res.data?.completed_on });
        } else {
          setError(res.message || 'Invalid invite link.');
          setStage('error');
        }
      })
      .catch(() => { setError('Could not load interview. Please check your connection.'); setStage('error'); });
  }, [uniqueId]);

  // Cleanup camera + timer on unmount
  useEffect(() => () => {
    if (stream) stream.getTracks().forEach(t => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
  }, [stream]);

  // ═══════════════════════════════════════════════════════════
  // Start interview — request camera + mic + call /start
  // ═══════════════════════════════════════════════════════════
  const startInterview = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true,
      });
      setStream(mediaStream);

      // Tell backend
      const res = await fetch(`${API_BASE}/interview-take/${uniqueId}/start`, { method: 'POST' });
      const j = await res.json();
      if (j.code !== 1) { setError(j.message); setStage('error'); return; }

      setStage('recording');
      setQIndex(0);
      setPhase('view');
      setSecondsLeft((data.questions[0]?.question_view_time || 30));
    } catch (err) {
      setError('Camera/microphone permission denied. Please allow access and refresh.');
      setStage('error');
    }
  };

  // Attach stream to <video> element when entering recording stage
  useEffect(() => {
    if (stage === 'recording' && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stage, stream]);

  // ═══════════════════════════════════════════════════════════
  // View phase timer — auto-start recording when time over
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    if (stage !== 'recording' || phase !== 'view') return;
    if (secondsLeft <= 0) { startRecording(); return; }
    timerRef.current = setInterval(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, phase, stage]);

  // ═══════════════════════════════════════════════════════════
  // Record phase timer — auto-stop when time over
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    if (phase !== 'recording') return;
    if (secondsLeft <= 0) { stopRecording(); return; }
    timerRef.current = setInterval(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, phase]);

  // ═══════════════════════════════════════════════════════════
  // Record / Stop / Upload
  // ═══════════════════════════════════════════════════════════
  // MIME type detection — Safari only supports video/mp4, Chrome/Firefox support video/webm
  const getSupportedMimeType = () => {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4;codecs=h264,aac',
      'video/mp4',
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return ''; // browser default
  };

  const startRecording = () => {
    if (!stream) return;
    chunksRef.current = [];
    const mimeType = getSupportedMimeType();
    const rec = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    rec.onstop = uploadRecording;
    rec.start();
    recorderRef.current = rec;

    setPhase('recording');
    const q = data.questions[qIndex];
    const minutes = q.question_time || 1;
    setSecondsLeft(minutes * 60);
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
  };

  const uploadRecording = async () => {
    setPhase('uploading');
    const recorder = recorderRef.current;
    const mimeType = recorder?.mimeType || 'video/webm';
    const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
    const blob = new Blob(chunksRef.current, { type: mimeType });
    const q = data.questions[qIndex];

    const formData = new FormData();
    formData.append('video', blob, `q${q.id}_response.${ext}`);
    formData.append('questionID', q.id);

    try {
      const res = await fetch(`${API_BASE}/interview-take/${uniqueId}/submit-video`, {
        method: 'POST',
        body: formData,
      });
      const j = await res.json();
      if (j.code !== 1) throw new Error(j.message);

      // Move to next question or complete
      const next = qIndex + 1;
      if (next < data.questions.length) {
        setQIndex(next);
        setPhase('view');
        setSecondsLeft(data.questions[next].question_view_time || 30);
      } else {
        // All done — call complete
        await fetch(`${API_BASE}/interview-take/${uniqueId}/complete`, { method: 'POST' });
        if (stream) stream.getTracks().forEach(t => t.stop());
        setStage('done');
      }
    } catch (err) {
      setError('Failed to upload video. Please refresh and try again.');
      setStage('error');
    }
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  // ── Loading ─────────────────────────────────────────────────
  if (stage === 'loading') {
    return (
      <div className="iv-container iv-center">
        <div className="iv-spinner"/>
        <p>Loading interview…</p>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────
  if (stage === 'error') {
    return (
      <div className="iv-container iv-center">
        <div className="iv-alert iv-alert--error">
          <RiAlertLine size={48}/>
          <h2>Unable to start interview</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // ── Already done ────────────────────────────────────────────
  if (stage === 'done') {
    return (
      <div className="iv-container iv-center">
        <div className="iv-success-screen">
          <RiCheckboxCircleLine size={72} className="iv-success-icon"/>
          <h1>{data?.alreadyDone ? 'Already Submitted' : 'Interview Submitted!'}</h1>
          <p>{data?.alreadyDone
            ? 'You have already completed this interview. Thank you!'
            : 'Thank you for completing the interview. The recruiter will review your responses and get back to you.'}
          </p>
          {data?.completedOn && (
            <div className="iv-meta">Completed on: {new Date(data.completedOn).toLocaleString('en-IN')}</div>
          )}
        </div>
      </div>
    );
  }

  // ── Landing ─────────────────────────────────────────────────
  if (stage === 'landing') {
    const iv = data.interview;
    return (
      <div className="iv-container iv-center">
        <div className="iv-landing">
          <div className="iv-landing-icon"><RiVideoLine size={48}/></div>
          <h1>{iv.name}</h1>
          <p className="iv-subtitle">{iv.description}</p>

          <div className="iv-details">
            <div className="iv-detail-row">
              <span className="iv-label">Email</span>
              <span className="iv-value">{data.email}</span>
            </div>
            <div className="iv-detail-row">
              <span className="iv-label">Questions</span>
              <span className="iv-value">{data.questions.length}</span>
            </div>
            <div className="iv-detail-row">
              <span className="iv-label">Total time</span>
              <span className="iv-value">~{data.questions.reduce((s, q) => s + (q.question_time || 1), 0)} minutes</span>
            </div>
          </div>

          <div className="iv-requirements">
            <h3>Before you start</h3>
            <ul>
              <li>Allow camera and microphone access when prompted</li>
              <li>Use a stable internet connection</li>
              <li>Find a quiet, well-lit place</li>
              <li>You cannot pause once started — recording is automatic</li>
              <li>Each question shows a preparation time, then auto-starts recording</li>
            </ul>
          </div>

          <button className="iv-btn iv-btn--primary iv-btn--large" onClick={startInterview}>
            <RiPlayCircleLine size={20}/>
            Start Interview
          </button>
        </div>
      </div>
    );
  }

  // ── Recording ───────────────────────────────────────────────
  const q   = data.questions[qIndex];
  const tot = data.questions.length;
  const pct = Math.round(((qIndex) / tot) * 100);
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timerText = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <div className="iv-container iv-recording">
      <header className="iv-header">
        <h2>{data.interview.name}</h2>
        <div className="iv-progress-bar">
          <div className="iv-progress-fill" style={{ width: `${pct}%` }}/>
        </div>
        <div style={{ marginTop: 6, fontSize: 13, color: 'var(--color-text-secondary)' }}>
          Question {qIndex + 1} of {tot}
        </div>
      </header>

      <div className="iv-content">
        <section className="iv-video-section">
          <video ref={videoRef} autoPlay muted playsInline className="iv-preview-video"/>
          {phase === 'recording' && (
            <div className="iv-recording-indicator">
              <span className="iv-recording-dot"/>
              REC
            </div>
          )}
        </section>

        <section className="iv-question-section">
          <h3 className="iv-question-text">{q.question_text}</h3>

          {phase === 'view' && (
            <>
              <p className="iv-question-desc">
                Read the question carefully. Recording will start automatically when timer reaches 0.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, fontSize: 14 }}>
                <RiTimerLine size={18}/>
                <span>Preparation: <strong>{timerText}</strong></span>
              </div>
              <button className="iv-btn iv-btn--record" onClick={startRecording} style={{ marginTop: 16 }}>
                <RiMicLine size={16}/>
                Start recording now
              </button>
            </>
          )}

          {phase === 'recording' && (
            <>
              <p className="iv-question-desc">Speak clearly. Recording will stop automatically when time runs out.</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, fontSize: 14 }}>
                <RiTimerLine size={18}/>
                <span>Time left: <strong>{timerText}</strong></span>
              </div>
              <button className="iv-btn iv-btn--stop" onClick={stopRecording} style={{ marginTop: 16 }}>
                <RiStopCircleLine size={16}/>
                Stop & Submit
              </button>
            </>
          )}

          {phase === 'uploading' && (
            <>
              <p className="iv-question-desc">Uploading your response… please wait.</p>
              <div className="iv-spinner" style={{ marginTop: 16 }}/>
            </>
          )}
        </section>
      </div>
    </div>
  );
}