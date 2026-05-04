import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBook, FiUsers, FiHelpCircle, FiVideo, FiFolder, FiTrendingUp } from 'react-icons/fi';
import AdminLayout from './AdminLayout';
import API from '../../api/axios';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    courses: 0, categories: 0, learners: 0, quizzes: 0, interviews: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const [cats, courses, users, quizzes, interviews] = await Promise.allSettled([
        API.get('/Webservice/getCategories'),
        API.get('/Webservice/getCatalogCourseList'),
        API.get('/Webservices/getAllUserList'),
        API.get('/Webservices/getAllQuizList'),
        API.get('/Webservices/getAllInterviewList'),
      ]);

      const count = r => (r.status === 'fulfilled' && r.value?.data?.code === 1)
        ? (r.value.data.data?.length || 0) : 0;

      setStats({
        categories: count(cats),
        courses:    count(courses),
        learners:   count(users),
        quizzes:    count(quizzes),
        interviews: count(interviews),
      });
    } catch {}
    setLoading(false);
  };

  const CARDS = [
    { key:'courses',    label:'Courses',    icon:<FiBook size={18}/>,       path:'/admin/courses',     color:'#6366f1' },
    { key:'categories', label:'Categories', icon:<FiFolder size={18}/>,     path:'/admin/categories',  color:'#00bc78' },
    { key:'learners',   label:'Learners',   icon:<FiUsers size={18}/>,      path:'/admin/learners',    color:'#f59e0b' },
    { key:'quizzes',    label:'Quizzes',    icon:<FiHelpCircle size={18}/>, path:'/admin/quizzes',     color:'#8b5cf6' },
    { key:'interviews', label:'Interviews', icon:<FiVideo size={18}/>,      path:'/admin/interviews',  color:'#ec4899' },
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className="adm-stat-grid">
        {CARDS.map(c => (
          <div key={c.key} className="adm-stat-card"
               style={{ cursor:'pointer' }} onClick={() => navigate(c.path)}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <div style={{ width:32, height:32, borderRadius:6, background:c.color+'1a',
                            color:c.color, display:'grid', placeItems:'center' }}>{c.icon}</div>
              <FiTrendingUp size={14} color="#9ca3af"/>
            </div>
            <div className="adm-stat-val">{loading ? '—' : stats[c.key]}</div>
            <div className="adm-stat-label">Total {c.label.toLowerCase()}</div>
          </div>
        ))}
      </div>

      <div className="adm-card" style={{ marginTop:6 }}>
        <div style={{ fontSize:15, fontWeight:700, color:'#0a1628', marginBottom:6 }}>Quick actions</div>
        <div style={{ fontSize:12, color:'#6b7280', marginBottom:16 }}>
          Jump straight to what you manage most.
        </div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          <button className="adm-btn adm-btn-primary" onClick={() => navigate('/admin/courses')}>
            + New Course
          </button>
          <button className="adm-btn adm-btn-ghost" onClick={() => navigate('/admin/categories')}
                  style={{ background:'#f3f4f6' }}>
            Manage Categories
          </button>
          <button className="adm-btn adm-btn-ghost" onClick={() => navigate('/admin/learners')}
                  style={{ background:'#f3f4f6' }}>
            Assign Learners
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
