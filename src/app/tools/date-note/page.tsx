'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { getCurrentUser } from '@/lib/session';
import PermissionGuard from '@/components/PermissionGuard';
import { PieChart, Pie, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// 类型定义
interface Diary {
  id: string;
  name: string;
  permission: 'private' | 'shared' | 'public';
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface DiaryEntry {
  id: string;
  diaryId: string;
  userId: string;
  username?: string;
  description: string;
  startTime: string;
  endTime?: string;
  icon: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

interface DiaryShare {
  id: string;
  diaryId: string;
  userId: string;
  shareUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  updatedAt: string;
  shareUserName?: string;
  inviterName?: string;
  diaryName?: string;
}

const DateNotePage = () => {
  // 状态管理
  const [user, setUser] = useState<any>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [selectedDiary, setSelectedDiary] = useState<string>('');
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [calendarEntries, setCalendarEntries] = useState<Map<string, DiaryEntry[]>>(new Map());
  const [isAddDiaryOpen, setIsAddDiaryOpen] = useState(false);
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [newDiary, setNewDiary] = useState({ name: '', permission: 'private' as 'private' | 'shared' | 'public' });
  const [newEntry, setNewEntry] = useState({
    diaryId: '',
    description: '',
    startTime: new Date(),
    endTime: undefined as Date | undefined,
    icon: '📝',
    color: '#3b82f6'
  });
  const [activeTab, setActiveTab] = useState('calendar');
  const [searchTerm, setSearchTerm] = useState('');
  const [invites, setInvites] = useState<DiaryShare[]>([]);
  const [loading, setLoading] = useState(false);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [diaryToDelete, setDiaryToDelete] = useState<Diary | null>(null);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [selectedShareDiary, setSelectedShareDiary] = useState<string>('');
  const [inviteUser, setInviteUser] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<{id: string, email: string}[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [usersPerPage] = useState(10);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [userInvites, setUserInvites] = useState<any[]>([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [showStatistics, setShowStatistics] = useState(true);
  const [statisticsType, setStatisticsType] = useState<'color' | 'icon'>('color');
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
    end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59).toISOString()
  });
  const [iconSearch, setIconSearch] = useState('');
  const [customIconText, setCustomIconText] = useState('');

  // 图标列表
  const icons = [
    '📝', '📅', '🎯', '✈️', '📌',
    '🌟', '📚', '🎨', '🏃', '🍎',
    '🎵', '📷', '💡', '💪', '🧠',
    '❤️', '🎉', '📊', '⚡', '🔥',
    '💑', '🎆', '💣', '🎂', '🎁',
    '🎄', '🎋', '🎏', '🎐', '🎑',
    '🎒', '🎓', '🎖️', '🎗️', '🎙️'
  ];

  // 颜色列表
  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
    '#14b8a6', '#f43f5e', '#eab308', '#8b4513', '#22c55e',
    '#7c3aed', '#0ea5e9', '#065f46', '#fb923c', '#f472b6'
  ];
  
  // 颜色名称映射
  const colorNames: Record<string, string> = {
    '#3b82f6': '蓝色',
    '#ef4444': '红色',
    '#10b981': '绿色',
    '#f59e0b': '黄色',
    '#8b5cf6': '紫色',
    '#ec4899': '粉色',
    '#06b6d4': '青色',
    '#84cc16': '浅绿色',
    '#f97316': '橙色',
    '#6366f1': '靛蓝色',
    '#14b8a6': '深青色',
    '#f43f5e': '玫红色',
    '#eab308': '金色',
    '#8b4513': '棕色',
    '#22c55e': '深绿色',
    '#7c3aed': '深紫色',
    '#0ea5e9': '天蓝色',
    '#065f46': '暗绿色',
    '#fb923c': '亮橙色',
    '#f472b6': '亮粉色'
  };

  // 检查用户登录状态
  const checkLoginStatus = async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
    setIsLoggedIn(!!currentUser);
  };

  // 获取认证头
  const getAuthHeaders = (): Record<string, string> | undefined => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth-token');
      return token ? { 'Authorization': `Bearer ${token}` } : undefined;
    }
    return undefined;
  };

  // 从API获取日记列表
  const fetchEntries = useCallback(async (diaryId: string) => {
    setEntriesLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/tools/datenote/entries?diaryId=${diaryId}`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        // 转换API返回的数据格式
        const formattedEntries = data.data.map((entry: any) => ({
          id: entry.id,
          diaryId: entry.diary_id,
          userId: entry.user_id,
          username: entry.username || entry.user_name || entry.user?.username,
          description: entry.description,
          startTime: entry.start_time,
          endTime: entry.end_time,
          icon: entry.icon,
          color: entry.color,
          createdAt: entry.created_at,
          updatedAt: entry.updated_at
        }));
        setEntries(formattedEntries);
        // 构建日历数据
        const calendarData = new Map<string, DiaryEntry[]>();
        formattedEntries.forEach((entry: DiaryEntry) => {
          const date = new Date(entry.startTime).toDateString();
          if (calendarData.has(date)) {
            calendarData.get(date)?.push(entry);
          } else {
            calendarData.set(date, [entry]);
          }
        });
        setCalendarEntries(calendarData);
      } else {
        setError(data.error || '获取日记失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('获取日记错误:', err);
    } finally {
      setEntriesLoading(false);
    }
  }, []);

  // 从API获取日记本列表
  const fetchDiaries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/tools/datenote/diaries', {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        // 转换API返回的数据格式
        const formattedDiaries = data.data.map((diary: any) => ({
          id: diary.id,
          name: diary.name,
          permission: diary.permission,
          userId: diary.user_id,
          createdAt: diary.created_at,
          updatedAt: diary.updated_at
        }));
        setDiaries(formattedDiaries);
        if (formattedDiaries.length > 0) {
          setSelectedDiary(formattedDiaries[0].id);
          fetchEntries(formattedDiaries[0].id);
        }
      } else {
        setError(data.error || '获取日记本失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('获取日记本失败:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchEntries]);

  // 从API获取邀请列表
  const fetchInvites = useCallback(async (diaryId?: string) => {
    try {
      const url = diaryId ? `/api/tools/datenote/shares?diaryId=${diaryId}` : '/api/tools/datenote/shares';
      const response = await fetch(url, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        // 转换API返回的数据格式
        const formattedInvites = data.data.map((invite: any) => ({
          id: invite.id,
          diaryId: invite.diary_id,
          userId: invite.user_id,
          shareUserId: invite.share_user_id,
          status: invite.status,
          createdAt: invite.created_at,
          updatedAt: invite.updated_at,
          diaryName: invite.tool_datenote_diaries?.name || '未知日记本',
          inviterName: invite.inviter?.username || '未知用户',
          shareUserName: invite.share_user?.username || invite.share_user_id
        }));
        setInvites(formattedInvites);
      } else {
        console.error('获取邀请列表失败:', data.error);
      }
    } catch (err) {
      console.error('获取邀请列表失败:', err);
    }
  }, []);

  // 从API获取用户收到的邀请
  const fetchUserInvites = useCallback(async () => {
    setInvitesLoading(true);
    try {
      const response = await fetch('/api/tools/datenote/shares', {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        // 转换API返回的数据格式，并只保留待处理的邀请
        const formattedInvites = data.data
          .filter((invite: any) => invite.status === 'pending')
          .map((invite: any) => ({
            id: invite.id,
            diaryId: invite.diary_id,
            userId: invite.user_id,
            shareUserId: invite.share_user_id,
            status: invite.status,
            createdAt: invite.created_at,
            updatedAt: invite.updated_at,
            diaryName: invite.tool_datenote_diaries?.name || '未知日记本',
            inviterName: invite.inviter?.username || '未知用户'
          }));
        setUserInvites(formattedInvites);
      } else {
        console.error('获取用户邀请失败:', data.error);
      }
    } catch (err) {
      console.error('获取用户邀请失败:', err);
    } finally {
      setInvitesLoading(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    checkLoginStatus();
  }, []);

  // 当登录状态变化时，加载数据
  useEffect(() => {
    if (isLoggedIn) {
      console.log('登录状态已更新，开始加载数据');
      fetchDiaries();
      fetchInvites();
      fetchUserInvites();
    }
  }, [isLoggedIn, fetchDiaries, fetchInvites, fetchUserInvites]);

  // 当选择的共享日记本变化时，重新获取邀请列表
  useEffect(() => {
    if (selectedShareDiary && isLoggedIn) {
      fetchInvites(selectedShareDiary);
    }
  }, [selectedShareDiary, isLoggedIn, fetchInvites]);

  // 当选择的日记本变化时，重新获取日记
  useEffect(() => {
    if (selectedDiary && isLoggedIn) {
      fetchEntries(selectedDiary);
    }
  }, [selectedDiary, isLoggedIn, fetchEntries]);

  // 当日历月份变化时，同步更新日记列表的查询时间范围
  useEffect(() => {
    // 更新日期范围为当前选择的月份
    const startDate = new Date(currentYear, currentMonth, 1);
    const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
    
    setDateRange({
      start: startDate.toISOString(),
      end: endDate.toISOString()
    });
  }, [currentMonth, currentYear]);

  // 处理添加日记本
  const handleAddDiary = async () => {
    if (newDiary.name) {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/tools/datenote/diaries', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify(newDiary)
        });
        const data = await response.json();
        if (data.success) {
          // 重新获取日记本列表
          await fetchDiaries();
          setIsAddDiaryOpen(false);
          setNewDiary({ name: '', permission: 'private' });
        } else {
          setError(data.error || '创建日记本失败');
        }
      } catch (err) {
        setError('网络错误，请稍后重试');
        console.error('创建日记本失败:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  // 处理添加日记
  const handleAddEntry = async () => {
    const diaryId = newEntry.diaryId || selectedDiary;
    if (diaryId) {
      setEntriesLoading(true);
      setError(null);
      try {
        // 将 Date 对象转换为 ISO 字符串
        const entryData = {
          ...newEntry,
          diaryId,
          startTime: newEntry.startTime.toISOString(),
          endTime: newEntry.endTime ? newEntry.endTime.toISOString() : undefined
        };
        
        const response = await fetch('/api/tools/datenote/entries', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify(entryData)
        });
        const data = await response.json();
        if (data.success) {
          // 重新获取日记列表
          await fetchEntries(diaryId);
          setIsAddEntryOpen(false);
          setNewEntry({
            diaryId: selectedDiary,
            description: '',
            startTime: new Date(),
            endTime: undefined as Date | undefined,
            icon: '📝',
            color: '#3b82f6'
          });
        } else {
          setError(data.error || '创建日记失败');
        }
      } catch (err) {
        setError('网络错误，请稍后重试');
        console.error('创建日记失败:', err);
      } finally {
        setEntriesLoading(false);
      }
    }
  };

  // 处理删除日记本
  const handleDeleteDiary = async () => {
    if (diaryToDelete) {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/tools/datenote/diaries?diaryId=${diaryToDelete.id}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        const data = await response.json();
        if (data.success) {
          // 重新获取日记本列表
          await fetchDiaries();
          setIsDeleteDialogOpen(false);
          setDiaryToDelete(null);
        } else {
          setError(data.error || '删除日记本失败');
        }
      } catch (err) {
        setError('网络错误，请稍后重试');
        console.error('删除日记本失败:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  // 处理删除日记
  const handleDeleteEntry = async (entryId: string) => {
    setDeletingEntryId(entryId);
    setError(null);
    try {
      const response = await fetch(`/api/tools/datenote/entries?entryId=${entryId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        // 重新获取日记列表
        await fetchEntries(selectedDiary);
      } else {
        setError(data.error || '删除日记失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('删除日记失败:', err);
    } finally {
      setDeletingEntryId(null);
    }
  };

  // 处理发送邀请
  const handleSendInvite = async (email?: string) => {
    const userEmail = email || inviteUser;
    if (!selectedShareDiary || !userEmail) {
      setError('请选择日记本并输入用户邮箱');
      return;
    }
    setError(null);
    try {
      const response = await fetch('/api/tools/datenote/shares', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          diaryId: selectedShareDiary,
          userId: userEmail
        })
      });
      const data = await response.json();
      if (data.success) {
        // 重新获取邀请列表
        await fetchInvites(selectedShareDiary);
        if (!email) {
          setInviteUser('');
          setUsers([]);
        }
      } else {
        setError(data.error || '发送邀请失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('发送邀请失败:', err);
    }
  };

  // 处理取消邀请
  const handleCancelInvite = async (inviteId: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/tools/datenote/shares?inviteId=${inviteId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        // 重新获取邀请列表
        await fetchInvites(selectedShareDiary);
      } else {
        setError(data.error || '取消邀请失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('取消邀请失败:', err);
    }
  };

  // 处理接受或拒绝邀请
  const handleInviteResponse = async (inviteId: string, status: 'accepted' | 'rejected') => {
    setError(null);
    try {
      const response = await fetch('/api/tools/datenote/shares', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          inviteId,
          status
        })
      });
      const data = await response.json();
      if (data.success) {
        // 重新获取用户邀请列表
        await fetchUserInvites();
        // 重新获取日记本列表，以便显示新加入的共享日记本
        await fetchDiaries();
      } else {
        setError(data.error || '处理邀请失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('处理邀请失败:', err);
    }
  };

  // 处理选择日期
  const handleSelectDate = (date: Date | undefined) => {
    setSelectedDate(date);
  };

  // 计算统计数据
  const getStatisticsData = () => {
    const filteredEntries = entries.filter(entry => entry.diaryId === selectedDiary);
    
    if (statisticsType === 'color') {
      // 按颜色统计
      const colorCount: Record<string, number> = {};
      filteredEntries.forEach(entry => {
        colorCount[entry.color] = (colorCount[entry.color] || 0) + 1;
      });
      return Object.entries(colorCount).map(([color, count]) => ({
        name: colorNames[color] || color,
        value: count,
        color
      }));
    } else {
      // 按图标统计
      const iconCount: Record<string, number> = {};
      filteredEntries.forEach(entry => {
        iconCount[entry.icon] = (iconCount[entry.icon] || 0) + 1;
      });
      return Object.entries(iconCount).map(([icon, count]) => ({
        name: icon,
        value: count,
        color: '#3b82f6' // 默认颜色，可根据需要调整
      }));
    }
  };

  // 获取指定日期的日记
  const getEntriesForDate = (date: Date | undefined) => {
    if (!date) return [];
    const dateString = date.toDateString();
    return calendarEntries.get(dateString) || [];
  };

  // 渲染日历单元格
  const renderCalendarCell = ({ date, state }: { date: Date; state: string }) => {
    const dateString = date.toDateString();
    const dayEntries = calendarEntries.get(dateString) || [];
    const rightMax = 3;
    const leftMax = 3;
    const bottomMax = 3;
    
    return (
      <div className="relative w-full h-full flex flex-col">
        <div className="flex-1 flex items-center">
          <div className="flex-1 flex flex-col justify-center gap-1 items-start pl-1">
            {dayEntries.length > rightMax && (
              dayEntries.slice(rightMax, rightMax + leftMax).map((entry, index) => (
                <div 
                  key={index} 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                  title={`${entry.icon} ${entry.description}`}
                />
              ))
            )}
          </div>
          <div className="flex-1 flex justify-center">
            <span className={`${state === 'selected' ? 'font-bold' : ''}`}>
              {date.getDate()}
            </span>
          </div>
          <div className="flex-1 flex flex-col justify-center gap-1 items-end pr-1">
            {dayEntries.length > 0 && (
              dayEntries.slice(0, rightMax).map((entry, index) => (
                <div 
                  key={index} 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                  title={`${entry.icon} ${entry.description}`}
                />
              ))
            )}
          </div>
        </div>
        {dayEntries.length > rightMax + leftMax && (
          <div className="flex justify-center gap-1 pb-1">
            {dayEntries.slice(rightMax + leftMax, rightMax + leftMax + bottomMax).map((entry, index) => (
              <div 
                key={index} 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: entry.color }}
                title={`${entry.icon} ${entry.description}`}
              />
            ))}
            {dayEntries.length > rightMax + leftMax + bottomMax && (
              <div 
                className="w-2 h-2 rounded-full bg-gray-300 flex items-center justify-center text-[8px] text-white"
                title={`+${dayEntries.length - (rightMax + leftMax + bottomMax)} more entries`}
              >
                +
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // 简单的日历组件
  const SimpleCalendar = ({ selected, onSelect, renderCell, currentMonth, currentYear, onMonthChange }: any) => {
    const getDaysInMonth = (month: number, year: number) => {
      return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (month: number, year: number) => {
      return new Date(year, month, 1).getDay();
    };

    const days = [];
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDayOfMonth = getFirstDayOfMonth(currentMonth, currentYear);

    // 添加上个月的占位天数
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }

    // 添加当月的天数
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentYear, currentMonth, i);
      days.push(date);
    }

    return (
      <div className="calendar">
        <div className="flex justify-between items-center mb-4">
          <button 
            className="p-2 hover:bg-gray-100 rounded-full"
            onClick={() => {
              if (currentMonth === 0) {
                onMonthChange(11, currentYear - 1);
              } else {
                onMonthChange(currentMonth - 1, currentYear);
              }
            }}
          >
            ←
          </button>
          <h3 className="text-base sm:text-lg font-medium">
            {new Date(currentYear, currentMonth).toLocaleString('zh-CN', { year: 'numeric', month: 'long' })}
          </h3>
          <button 
            className="p-2 hover:bg-gray-100 rounded-full"
            onClick={() => {
              if (currentMonth === 11) {
                onMonthChange(0, currentYear + 1);
              } else {
                onMonthChange(currentMonth + 1, currentYear);
              }
            }}
          >
            →
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['日', '一', '二', '三', '四', '五', '六'].map(day => (
            <div key={day} className="text-center font-medium text-xs sm:text-sm">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            if (!day) {
              return <div key={index} className="h-8 sm:h-10 md:h-12"></div>;
            }
            const isSelected = selected && day.toDateString() === selected.toDateString();
            return (
              <div
                key={index}
                className={`h-8 sm:h-10 md:h-12 flex items-center justify-center rounded-full cursor-pointer ${isSelected ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                onClick={() => onSelect(day)}
              >
                {renderCell({ date: day, state: isSelected ? 'selected' : '' })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 未登录提示
  const renderLoginPrompt = () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
        <h2 className="text-xl sm:text-2xl font-bold text-center mb-4">请先登录</h2>
        <p className="text-gray-600 text-center mb-6">
          您需要登录才能使用《事纪》工具
        </p>
        <div className="flex justify-center">
          <a 
            href={`/auth/login?callback=${encodeURIComponent('/tools/date-note')}`}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            去登录
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 检查登录状态 */}
      {!isLoggedIn ? (
        renderLoginPrompt()
      ) : (
        <>
          {/* 顶部导航 */}
          <header className="bg-white shadow-sm border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800">《事纪》</h1>
                <div className="flex flex-wrap items-center gap-2">
                  <button 
                    className="px-2 sm:px-3 py-1.5 sm:py-2 bg-white border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all text-xs sm:text-sm font-medium shadow-sm"
                    onClick={() => setIsAddDiaryOpen(true)}
                  >
                    新建日记本
                  </button>
                  <button 
                    className="px-2 sm:px-3 py-1.5 sm:py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all text-xs sm:text-sm font-medium shadow-sm"
                    onClick={() => setIsAddEntryOpen(true)}
                  >
                    新建日记
                  </button>
                  <button 
                    className="px-2 sm:px-3 py-1.5 sm:py-2 bg-white border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all relative text-xs sm:text-sm font-medium shadow-sm"
                    onClick={() => {
                      setIsInviteModalOpen(true);
                      fetchUserInvites();
                    }}
                  >
                    查看邀请
                    {userInvites.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {userInvites.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </header>

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* 错误提示 */}
            {error && (
              <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-6">
              {/* 日记本列表 - 移动端优先 */}
              <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
                <h2 className="text-base sm:text-lg font-semibold mb-4 text-gray-800">日记本</h2>
                <div className="max-h-[200px] sm:max-h-[300px] md:max-h-[500px] overflow-y-auto">
                  <ul className="space-y-1">
                    {diaries.map(diary => (
                      <li key={diary.id} className="flex items-center gap-2">
                        <button 
                          className={`flex-1 text-left px-3 py-2 rounded-md transition-all ${selectedDiary === diary.id ? 'bg-blue-50 text-blue-600 font-medium' : 'hover:bg-gray-50'}`}
                          onClick={() => setSelectedDiary(diary.id)}
                        >
                          <span className="mr-2">
                            {diary.permission === 'private' && '🔒'}
                            {diary.permission === 'shared' && '👥'}
                            {diary.permission === 'public' && '🌐'}
                          </span>
                          {diary.name}
                        </button>
                        {/* 只有创建者可以删除 */}
                        {diary.userId === user?.id && (
                          <button
                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-full hover:bg-red-50"
                            onClick={() => {
                              setDiaryToDelete(diary);
                              setIsDeleteDialogOpen(true);
                            }}
                            title="删除日记本"
                          >
                            🗑️
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 内容区 */}
              <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4 sm:p-5">
                  {/* 标签页 */}
                  <div className="flex overflow-x-auto border-b border-gray-200 mb-4 sm:mb-5 pb-1">
                    <button 
                      className={`px-3 sm:px-4 py-2 whitespace-nowrap transition-all ${activeTab === 'calendar' ? 'border-b-2 border-blue-500 text-blue-500 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                      onClick={() => setActiveTab('calendar')}
                    >
                      日历视图
                    </button>
                    <button 
                      className={`px-3 sm:px-4 py-2 whitespace-nowrap transition-all ${activeTab === 'list' ? 'border-b-2 border-blue-500 text-blue-500 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                      onClick={() => setActiveTab('list')}
                    >
                      日记列表
                    </button>
                    <button 
                      className={`px-3 sm:px-4 py-2 whitespace-nowrap transition-all ${activeTab === 'search' ? 'border-b-2 border-blue-500 text-blue-500 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                      onClick={() => setActiveTab('search')}
                    >
                      开放搜索
                    </button>
                    <button 
                      className={`px-3 sm:px-4 py-2 whitespace-nowrap transition-all ${activeTab === 'share' ? 'border-b-2 border-blue-500 text-blue-500 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                      onClick={() => setActiveTab('share')}
                    >
                      共享管理
                    </button>
                  </div>

                  {/* 日历视图 */}
                  {activeTab === 'calendar' && (
                    <div>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-5">
                        <h2 className="text-sm sm:text-base md:text-lg font-semibold text-gray-800">日历</h2>
                        <select 
                          className="border border-gray-200 rounded-md px-2 sm:px-3 py-1.5 sm:py-2 w-full sm:w-[200px] focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-all text-sm"
                          value={selectedDiary}
                          onChange={(e) => setSelectedDiary(e.target.value)}
                        >
                          {diaries.map(diary => (
                            <option key={diary.id} value={diary.id}>
                              {diary.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      {/* 数据加载中或尚未加载时显示加载动态 */}
                      {entriesLoading || entries.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg">
                          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                          <p className="text-gray-500">加载中...</p>
                        </div>
                      ) : (
                        <>
                          <SimpleCalendar
                            selected={selectedDate}
                            onSelect={handleSelectDate}
                            renderCell={renderCalendarCell}
                            currentMonth={currentMonth}
                            currentYear={currentYear}
                            onMonthChange={(month: number, year: number) => {
                              setCurrentMonth(month);
                              setCurrentYear(year);
                            }}
                          />
                          <hr className="my-4" />
                          <div>
                            <h3 className="text-sm sm:text-md font-medium mb-2">
                              {selectedDate ? selectedDate.toLocaleDateString() : '选择日期'} 的日记
                            </h3>
                            <div className="space-y-2">
                              {getEntriesForDate(selectedDate).map(entry => (
                                <div key={entry.id} className="p-3 border-l-4" style={{ borderLeftColor: entry.color }}>
                                  <div className="flex items-start gap-3">
                                    <span className="text-xl">{entry.icon}</span>
                                    <div className="flex-1">
                                      <p className="text-sm text-gray-600">
                                        {new Date(entry.startTime).toLocaleTimeString()}
                                        {entry.endTime && ` - ${new Date(entry.endTime).toLocaleTimeString()}`}
                                        {entry.username && ` · ${entry.username}`}
                                      </p>
                                      <p className="mt-1">{entry.description}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {getEntriesForDate(selectedDate).length === 0 && (
                                <p className="text-gray-500 text-center py-4">
                                  该日期暂无日记
                                </p>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* 日记列表 */}
                  {activeTab === 'list' && (
                    <div>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                        <h2 className="text-base sm:text-lg font-semibold">日记列表</h2>
                        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                          <select 
                            className="border rounded-md px-3 py-2 w-full sm:w-[200px]"
                            value={selectedDiary}
                            onChange={(e) => setSelectedDiary(e.target.value)}
                          >
                            {diaries.map(diary => (
                              <option key={diary.id} value={diary.id}>
                                {diary.name}
                              </option>
                            ))}
                          </select>
                          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            <input
                              type="date"
                              className="border rounded-md px-3 py-2"
                              value={dateRange.start.split('T')[0]}
                              onChange={(e) => setDateRange(prev => ({
                                ...prev,
                                start: new Date(e.target.value).toISOString()
                              }))}
                            />
                            <span className="flex items-center">至</span>
                            <input
                              type="date"
                              className="border rounded-md px-3 py-2"
                              value={dateRange.end.split('T')[0]}
                              onChange={(e) => setDateRange(prev => ({
                                ...prev,
                                end: new Date(e.target.value + 'T23:59:59').toISOString()
                              }))}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {entries
                          .filter(entry => {
                            const entryDate = new Date(entry.startTime);
                            const startDate = new Date(dateRange.start);
                            const endDate = new Date(dateRange.end);
                            return entry.diaryId === selectedDiary && 
                                   entryDate >= startDate && 
                                   entryDate <= endDate;
                          })
                          .map(entry => (
                            <div key={entry.id} className="p-3 border rounded-md flex justify-between">
                              <div className="flex-1">
                                <div className="flex items-start gap-3">
                                  <span className="text-xl">{entry.icon}</span>
                                  <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <p className="text-sm text-gray-600">
                                          {new Date(entry.startTime).toLocaleString()}
                                          {entry.endTime && ` - ${new Date(entry.endTime).toLocaleTimeString()}`}
                                          {entry.username && ` · ${entry.username}`}
                                        </p>
                                        <p className="mt-1">{entry.description}</p>
                                      </div>
                                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                              {/* 只有创建者可以删除 */}
                              {entry.userId === user?.id && (
                                <button
                                  className="p-1 text-red-500 hover:text-red-700 flex items-center justify-center"
                                  onClick={() => handleDeleteEntry(entry.id)}
                                  disabled={deletingEntryId === entry.id}
                                >
                                  {deletingEntryId === entry.id ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-500 border-t-transparent"></div>
                                  ) : (
                                    '🗑️'
                                  )}
                                </button>
                              )}
                            </div>
                          ))}
                        {entries
                          .filter(entry => {
                            const entryDate = new Date(entry.startTime);
                            const startDate = new Date(dateRange.start);
                            const endDate = new Date(dateRange.end);
                            return entry.diaryId === selectedDiary && 
                                   entryDate >= startDate && 
                                   entryDate <= endDate;
                          })
                          .length === 0 && (
                          <p className="text-gray-500 text-center py-4">
                            该时间范围内暂无日记
                          </p>
                        )}
                      </div>

                      {/* 统计图表 */}
                      {showStatistics && (
                        <div className="mt-8">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-base sm:text-lg font-semibold">统计分析</h3>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <button
                                  className={`px-3 py-1 rounded-md ${statisticsType === 'color' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
                                  onClick={() => setStatisticsType('color')}
                                >
                                  按颜色
                                </button>
                                <button
                                  className={`px-3 py-1 rounded-md ${statisticsType === 'icon' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
                                  onClick={() => setStatisticsType('icon')}
                                >
                                  按图标
                                </button>
                              </div>
                              <button
                                className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
                                onClick={() => setShowStatistics(false)}
                              >
                                隐藏
                              </button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* 饼状图 */}
                            <div className="bg-white p-4 rounded-lg border shadow-sm">
                              <h4 className="text-sm font-medium mb-4">{statisticsType === 'color' ? '颜色分布' : '图标分布'}</h4>
                              <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                  <Pie
                                    data={getStatisticsData()}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                    label={({ name, percent }) => {
                                      if (statisticsType === 'color') {
                                        // 对于颜色统计，不显示文字标签，只通过颜色区分
                                        return `${((percent || 0) * 100).toFixed(0)}%`;
                                      }
                                      return `${name} ${((percent || 0) * 100).toFixed(0)}%`;
                                    }}
                                  >
                                    {getStatisticsData().map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Pie>
                                  <Tooltip />
                                  <Legend />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                            
                            {/* 柱状图 */}
                            <div className="bg-white p-4 rounded-lg border shadow-sm">
                              <h4 className="text-sm font-medium mb-4">{statisticsType === 'color' ? '颜色数量' : '图标数量'}</h4>
                              <ResponsiveContainer width="100%" height={300}>
                                <BarChart
                                  data={getStatisticsData()}
                                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis 
                                    dataKey="name" 
                                    tick={({ x, y, payload }) => {
                                      const dataPayload = payload as any;
                                      if (statisticsType === 'color') {
                                        // 对于颜色统计，显示颜色块
                                        return (
                                          <g transform={`translate(${x},${Number(y) + 20})`}>
                                            <rect 
                                              x={-10} 
                                              y={-10} 
                                              width={20} 
                                              height={20} 
                                              fill={dataPayload.color} 
                                              stroke="#fff" 
                                              strokeWidth={1}
                                            />
                                          </g>
                                        );
                                      }
                                      // 对于图标统计，显示文字
                                      return (
                                        <text x={x} y={Number(y) + 20} textAnchor="middle" fill="#666">
                                          {dataPayload.value}
                                        </text>
                                      );
                                    }}
                                  />
                                  <YAxis />
                                  <Tooltip />
                                  <Bar dataKey="value" name="数量">
                                    {getStatisticsData().map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {!showStatistics && (
                        <div className="mt-8 text-center">
                          <button
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                            onClick={() => setShowStatistics(true)}
                          >
                            显示统计分析
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 开放搜索 */}
                  {activeTab === 'search' && (
                    <div>
                      <h2 className="text-base sm:text-lg font-semibold mb-4">开放日记搜索</h2>
                      <div className="mb-4">
                        <input
                          type="text"
                          className="w-full border rounded-md px-3 py-2"
                          placeholder="搜索日记本名称"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <div className="space-y-3">
                        {/* 这里可以添加开放日记的搜索结果 */}
                        <p className="text-gray-500 text-center py-4">
                          搜索开放日记
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 共享管理 */}
                  {activeTab === 'share' && (
                    <div>
                      <h2 className="text-base sm:text-lg font-semibold mb-4">共享管理</h2>
                      <div className="space-y-6">
                        {/* 选择日记本 */}
                        <div>
                          <label className="text-sm font-medium block mb-2">我的共享日记本</label>
                          <select 
                            className="w-full border rounded-md px-3 py-2"
                            value={selectedShareDiary}
                            onChange={(e) => setSelectedShareDiary(e.target.value)}
                          >
                            <option value="">请选择共享日记本</option>
                            {diaries
                              .filter(diary => diary.userId === user?.id && diary.permission === 'shared')
                              .map(diary => (
                                <option key={diary.id} value={diary.id}>
                                  {diary.name}
                                </option>
                              ))}
                          </select>
                        </div>

                        {selectedShareDiary ? (
                          <div className="space-y-6">
                            {/* 邀请用户 */}
                            <div>
                              <h3 className="text-base sm:text-lg font-medium mb-3">邀请用户</h3>
                              <button
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                onClick={() => {
                                  setIsUserModalOpen(true);
                                  setSearchKeyword('');
                                  setSelectedUsers([]);
                                  setCurrentPage(1);
                                  setUsers([]);
                                  setTotalUsers(0);
                                }}
                              >
                                选择用户
                              </button>
                            </div>

                            {/* 邀请列表 */}
                            <div>
                              <h3 className="text-base sm:text-lg font-medium mb-3">邀请列表</h3>
                              <div className="space-y-3">
                                {invites
                                  .filter(invite => invite.diaryId === selectedShareDiary)
                                  .map(invite => (
                                    <div key={invite.id} className="p-3 border rounded-md flex justify-between items-center">
                                      <div>
                                        <p className="font-medium">被邀请人: {invite.shareUserName}</p>
                                        <p className="text-sm text-gray-600">
                                          邀请人: {invite.inviterName}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                          日记本: {invite.diaryName}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                          邀请时间: {new Date(invite.createdAt).toLocaleString()}
                                        </p>
                                        <p className="text-sm">
                                          状态: 
                                          <span className={`ml-1 ${invite.status === 'pending' ? 'text-yellow-600' : invite.status === 'accepted' ? 'text-green-600' : invite.status === 'rejected' ? 'text-red-600' : 'text-gray-600'}`}>
                                            {invite.status === 'pending' ? '待接受' : invite.status === 'accepted' ? '已接受' : invite.status === 'rejected' ? '已拒绝' : '已取消'}
                                          </span>
                                        </p>
                                      </div>
                                      {invite.status === 'pending' && (
                                        <button
                                          className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                                          onClick={() => handleCancelInvite(invite.id)}
                                        >
                                          取消邀请
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                {invites.filter(invite => invite.diaryId === selectedShareDiary).length === 0 && (
                                  <p className="text-gray-500 text-center py-4">
                                    暂无邀请
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-64">
                            <p className="text-gray-500">请选择一个共享日记本</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 选择用户弹框 */}
                  {isUserModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                      <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-lg sm:text-xl font-semibold mb-4">选择用户</h2>
                        <div className="space-y-4">
                          <div>
                            <input
                              type="text"
                              className="w-full border rounded-md px-3 py-2"
                              placeholder="搜索用户邮箱或ID"
                              value={searchKeyword}
                              onChange={(e) => setSearchKeyword(e.target.value)}
                              onInput={async (e) => {
                                const value = (e.target as HTMLInputElement).value;
                                if (value.length > 2) {
                                  setSearchingUsers(true);
                                  setCurrentPage(1);
                                  try {
                                    // 调用API搜索用户，查询vw_user表
                                    const response = await fetch(`/api/tools/datenote/users?search=${encodeURIComponent(value)}&page=1&limit=${usersPerPage}`, {
                                      headers: getAuthHeaders()
                                    });
                                    const data = await response.json();
                                    if (data.success) {
                                      setUsers(data.users || []);
                                      setTotalUsers(data.total || 0);
                                    } else {
                                      setUsers([]);
                                      setTotalUsers(0);
                                    }
                                  } catch (err) {
                                    console.error('搜索用户失败:', err);
                                    setUsers([]);
                                    setTotalUsers(0);
                                  } finally {
                                    setSearchingUsers(false);
                                  }
                                } else {
                                  setUsers([]);
                                  setTotalUsers(0);
                                }
                              }}
                            />
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <h3 className="text-sm font-medium">用户列表</h3>
                              <span className="text-sm text-gray-500">已选择 {selectedUsers.length} 人</span>
                            </div>
                            {searchingUsers ? (
                              <div className="flex justify-center items-center py-4">
                                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
                              </div>
                            ) : users.length > 0 ? (
                              <div className="border rounded-md max-h-60 overflow-y-auto">
                                {users.map(user => (
                                  <div
                                    key={user.id}
                                    className={`p-3 hover:bg-gray-100 flex justify-between items-center ${selectedUsers.some(u => u.id === user.id) ? 'bg-blue-50' : ''}`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <input
                                        type="checkbox"
                                        className="h-4 w-4 text-blue-600 rounded"
                                        checked={selectedUsers.some(u => u.id === user.id)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedUsers([...selectedUsers, {id: user.id, email: user.email}]);
                                          } else {
                                            setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
                                          }
                                        }}
                                      />
                                      <span>{user.username} ({user.email})</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-500 text-center py-4">
                                暂无用户
                              </p>
                            )}
                          </div>
                          {/* 分页 */}
                          {users.length > 0 && (
                            <div className="flex justify-between items-center">
                              <button
                                className="px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={async () => {
                                  if (currentPage > 1) {
                                    const newPage = currentPage - 1;
                                    setCurrentPage(newPage);
                                    setSearchingUsers(true);
                                    try {
                                      // 调用API获取上一页用户
                                      const response = await fetch(`/api/tools/datenote/users?search=${encodeURIComponent(searchKeyword)}&page=${newPage}&limit=${usersPerPage}`, {
                                        headers: getAuthHeaders()
                                      });
                                      const data = await response.json();
                                      if (data.success) {
                                        setUsers(data.users || []);
                                      }
                                    } catch (err) {
                                      console.error('获取用户失败:', err);
                                    } finally {
                                      setSearchingUsers(false);
                                    }
                                  }
                                }}
                                disabled={currentPage === 1}
                              >
                                上一页
                              </button>
                              <span className="text-sm">
                                第 {currentPage} 页，共 {Math.ceil(totalUsers / usersPerPage)} 页
                              </span>
                              <button
                                className="px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={async () => {
                                  if (currentPage < Math.ceil(totalUsers / usersPerPage)) {
                                    const newPage = currentPage + 1;
                                    setCurrentPage(newPage);
                                    setSearchingUsers(true);
                                    try {
                                      // 调用API获取下一页用户
                                      const response = await fetch(`/api/tools/datenote/users?search=${encodeURIComponent(searchKeyword)}&page=${newPage}&limit=${usersPerPage}`, {
                                        headers: getAuthHeaders()
                                      });
                                      const data = await response.json();
                                      if (data.success) {
                                        setUsers(data.users || []);
                                      }
                                    } catch (err) {
                                      console.error('获取用户失败:', err);
                                    } finally {
                                      setSearchingUsers(false);
                                    }
                                  }
                                }}
                                disabled={currentPage === Math.ceil(totalUsers / usersPerPage)}
                              >
                                下一页
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                          <button 
                            className="px-4 py-2 border rounded-md hover:bg-gray-100"
                            onClick={() => {
                              setIsUserModalOpen(false);
                              setSelectedUsers([]);
                              setCurrentPage(1);
                            }}
                          >
                            取消
                          </button>
                          <button 
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={async () => {
                              // 批量发送邀请
                              for (const user of selectedUsers) {
                                await handleSendInvite(user.id);
                              }
                              setIsUserModalOpen(false);
                              setSelectedUsers([]);
                              setCurrentPage(1);
                            }}
                            disabled={selectedUsers.length === 0}
                          >
                            发起邀请
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
          </main>

          {/* 邀请列表弹框 */}
          {isInviteModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
                <h2 className="text-xl font-semibold mb-4">我的邀请</h2>
                {invitesLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
                  </div>
                ) : userInvites.length > 0 ? (
                  <div className="space-y-4">
                    {userInvites.map(invite => (
                      <div key={invite.id} className="p-4 border rounded-md">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">来自: {invite.inviterName}</p>
                            <p className="text-sm text-gray-600">
                              邀请您加入日记本: <span className="font-medium">{invite.diaryName}</span>
                            </p>
                            <p className="text-sm text-gray-500">
                              邀请时间: {new Date(invite.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                              onClick={() => handleInviteResponse(invite.id, 'accepted')}
                            >
                              接受
                            </button>
                            <button
                              className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                              onClick={() => handleInviteResponse(invite.id, 'rejected')}
                            >
                              拒绝
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64">
                    <p className="text-gray-500">暂无邀请</p>
                  </div>
                )}
                <div className="flex justify-end gap-2 mt-6">
                  <button 
                    className="px-4 py-2 border rounded-md hover:bg-gray-100"
                    onClick={() => setIsInviteModalOpen(false)}
                  >
                    关闭
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 新建日记本对话框 */}
          {isAddDiaryOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-semibold mb-4">新建日记本</h2>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium block">日记本名称</label>
                    <input
                      type="text"
                      className="w-full border rounded-md px-3 py-2"
                      value={newDiary.name}
                      onChange={(e) => setNewDiary({ ...newDiary, name: e.target.value })}
                      placeholder="输入日记本名称"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium block">权限设置</label>
                    <select
                      className="w-full border rounded-md px-3 py-2"
                      value={newDiary.permission}
                      onChange={(e) => setNewDiary({ ...newDiary, permission: e.target.value as 'private' | 'shared' | 'public' })}
                    >
                      <option value="private">私有</option>
                      <option value="shared">共享</option>
                      <option value="public">开放</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button 
                    className="px-4 py-2 border rounded-md hover:bg-gray-100"
                    onClick={() => setIsAddDiaryOpen(false)}
                  >
                    取消
                  </button>
                  <button 
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    onClick={handleAddDiary}
                  >
                    创建
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 新建日记对话框 */}
          {isAddEntryOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg w-full max-w-lg max-h-[80vh] flex flex-col shadow-xl">
                <div className="p-4 border-b bg-gray-50">
                  <h2 className="text-lg font-semibold text-gray-800">新建日记</h2>
                </div>
                <div className="p-5 flex-1 overflow-y-auto space-y-4">
                  {/* 日记本选择 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 block">选择日记本</label>
                    <select
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      value={newEntry.diaryId || selectedDiary}
                      onChange={(e) => {
                        setNewEntry({ ...newEntry, diaryId: e.target.value });
                      }}
                    >
                      {diaries.map(diary => (
                        <option key={diary.id} value={diary.id}>
                          {diary.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* 描述 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 block">描述</label>
                    <textarea
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                      rows={3}
                      value={newEntry.description}
                      onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                      placeholder="输入日记内容..."
                    />
                  </div>
                  
                  {/* 时间选择 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 block">开始时间</label>
                      <DatePicker
                        selected={newEntry.startTime}
                        onChange={(date: Date | null) => {
                          if (date) {
                            setNewEntry({ ...newEntry, startTime: date });
                          }
                        }}
                        showTimeSelect
                        timeFormat="HH:mm:ss"
                        timeIntervals={1}
                        dateFormat="yyyy-MM-dd HH:mm:ss"
                        className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        portalId="date-picker-portal"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 block">结束时间（可选）</label>
                      <DatePicker
                        selected={newEntry.endTime}
                        onChange={(date: Date | null) => {
                          setNewEntry({ ...newEntry, endTime: date || undefined });
                        }}
                        showTimeSelect
                        timeFormat="HH:mm:ss"
                        timeIntervals={1}
                        dateFormat="yyyy-MM-dd HH:mm:ss"
                        className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        portalId="date-picker-portal"
                      />
                    </div>
                  </div>
                  
                  {/* 图标选择 */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-700 block">选择图标</label>
                    
                    {/* 当前选中的图标 */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center gap-3 transition-all hover:shadow-sm">
                      <div className="text-3xl">{newEntry.icon}</div>
                      <div>
                        <p className="text-xs text-gray-500">当前选择</p>
                        <p className="text-sm font-medium text-gray-800">{newEntry.icon}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {/* 图标搜索 */}
                      <div className="relative">
                        <input
                          type="text"
                          className="w-full border border-gray-300 rounded-md pl-10 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                          placeholder="搜索图标..."
                          value={iconSearch}
                          onChange={(e) => setIconSearch(e.target.value)}
                        />
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                          🔍
                        </div>
                      </div>
                      
                      {/* 文字生成图标 */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                          placeholder="输入文字生成图标"
                          value={customIconText}
                          onChange={(e) => setCustomIconText(e.target.value)}
                        />
                        <button
                          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => {
                            if (customIconText) {
                              setNewEntry({ ...newEntry, icon: customIconText });
                              setCustomIconText('');
                            }
                          }}
                          disabled={!customIconText}
                        >
                          使用
                        </button>
                      </div>
                      
                      {/* 图标选择网格 */}
                      <div className="grid grid-cols-8 gap-2 max-h-32 overflow-y-auto p-2 bg-gray-50 rounded-lg border border-gray-200">
                        {icons
                          .filter(icon => icon.toLowerCase().includes(iconSearch.toLowerCase()))
                          .map((icon, index) => (
                            <button
                              key={index}
                              className={`w-9 h-9 flex items-center justify-center rounded-full transition-all ${newEntry.icon === icon ? 'bg-blue-100 ring-2 ring-blue-500' : 'hover:bg-gray-100'}`}
                              onClick={() => setNewEntry({ ...newEntry, icon })}
                              title={icon}
                              aria-label={`选择图标 ${icon}`}
                            >
                              {icon}
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* 颜色选择 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 block">选择颜色</label>
                    <div className="grid grid-cols-10 gap-2">
                      {colors.map((color, index) => (
                        <button
                          key={index}
                          className={`w-7 h-7 rounded-full transition-all duration-200 ${newEntry.color === color ? 'scale-110 ring-2 ring-gray-300' : 'hover:scale-105'}`}
                          style={{ 
                            backgroundColor: color
                          }}
                          onClick={() => setNewEntry({ ...newEntry, color })}
                          aria-label={`选择颜色 ${color}`}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                  <button 
                    className="px-4 py-2 border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all text-sm font-medium"
                    onClick={() => setIsAddEntryOpen(false)}
                    disabled={entriesLoading}
                  >
                    取消
                  </button>
                  <button 
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-sm"
                    onClick={handleAddEntry}
                    disabled={entriesLoading}
                  >
                    {entriesLoading && (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    )}
                    {entriesLoading ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
            </div>
          )}



          {/* 删除日记本对话框 */}
          {isDeleteDialogOpen && diaryToDelete && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-semibold mb-4">确认删除</h2>
                <p className="mb-6">
                  确定要删除日记本 &quot;{diaryToDelete.name}&quot; 吗？
                  <br />
                  <span className="text-red-500">此操作将同时删除该日记本的所有日记和共享记录，且无法恢复。</span>
                </p>
                <div className="flex justify-end gap-2">
                  <button 
                    className="px-4 py-2 border rounded-md hover:bg-gray-100"
                    onClick={() => setIsDeleteDialogOpen(false)}
                  >
                    取消
                  </button>
                  <button 
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    onClick={handleDeleteDiary}
                  >
                    确认删除
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* DatePicker portal for mobile compatibility */}
          <div id="date-picker-portal"></div>

        </>
      )}
    </div>
  );
};

export default function DateNotePageWrapper() {
  return (
    <PermissionGuard 
      menuPath="/tools/date-note"
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">没有权限</h2>
            <p className="text-gray-600 mb-6">
              您没有权限使用《事纪》工具
            </p>
            <a 
              href="/" 
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors inline-block"
            >
              返回首页
            </a>
          </div>
        </div>
      }
    >
      <DateNotePage />
    </PermissionGuard>
  );
}