/* eslint-disable react-hooks/exhaustive-deps */
"use client"
import './globals.css';
import { useState, useEffect, FormEvent, ChangeEvent, useRef } from 'react';
import { Chat, ChatUser } from './types/index';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<Chat[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const bottomRef = useRef<HTMLDivElement | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('token');
      // const parsedUser = JSON.parse(userData);
      setUser(user);

      if (user.role == 'customer') {
        fetchAdminUsers(token);
      } else {
        fetchUsers(token);
      }
    }
    setLoading(false);
    
    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (selectedUser && user) {
      fetchMessages(user.id);
      initializeSSE();
    } else {
      // Close existing SSE connection if no user selected
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setConnectionStatus('disconnected');
      }
    }
  }, [selectedUser, user]);

  // Auto-scroll ke bawah saat messages berubah
  useEffect(() => {
    const timeout = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 0);

    return () => clearTimeout(timeout);
  }, [messages]);

  // Auto-scroll ke bawah saat window di-resize
  useEffect(() => {
    const handleResize = () => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const initializeSSE = () => {
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    if (!user) return;

    setConnectionStatus('connecting');
    
    console.log('Initializing SSE for:', { userId: user.id });
    
    // Create new SSE connection
    const eventSource = new EventSource(`/pages/api/sse?userId=${user.id}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('SSE connection opened for userId:', user.id);
      setConnectionStatus('connected');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('SSE message received:', data);
        
        switch (data.type) {
          case 'connected':
            console.log('SSE connected:', data.message);
            setConnectionStatus('connected');
            break;
          case 'new-message':
            console.log('New message via SSE:', data.message);
            setMessages(prev => {
              // Check if message already exists to avoid duplicates
              const messageExists = prev.some(msg => msg.id === data.message.id);
              if (!messageExists) {
                console.log('Adding new message to state');
                return [...prev, data.message];
              }
              console.log('Message already exists, skipping');
              return prev;
            });
            break;
          case 'ping':
            // Keep-alive ping, no action needed
            console.log('SSE ping received');
            break;
          default:
            console.log('Unknown SSE message type:', data.type);
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      setConnectionStatus('disconnected');
      
      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        if (selectedUser && user) {
          console.log('Attempting to reconnect SSE...');
          initializeSSE();
        }
      }, 3000);
    };
  };

  const fetchAdminUsers = async (token: string): Promise<void> => {
    try {
      const response = await fetch('/pages/api/users/admin', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUsers(userData);
        setSelectedUser(userData[0]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchUsers = async (token: string): Promise<void> => {
    try {
      const response = await fetch('/pages/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const usersData = await response.json();
        setUsers(usersData);

        if (usersData.length === 1) {
          setSelectedUser(usersData[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchMessages = async (userId: string): Promise<void> => {
    try {
      const response = await fetch(`/pages/api/messages/${userId}`);
      
      if (response.ok) {
        const messagesData = await response.json();
        setMessages(messagesData);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleAuth = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');

    const endpoint = isLogin ? '/pages/api/auth/login' : '/pages/api/auth/register';
    const payload = isLogin 
      ? { email, password }
      : { displayName, email, password };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        setUser(data.user);
        
        if (data.role == 'customer') {
          fetchAdminUsers(data.token);
        } else {
          fetchUsers(data.token);
        }
      } else {
        setError(data.message);
      }
    } catch (error) {
      console.error('Auth error:', error);
      setError('Authentication failed');
    }
  };

  const handleLogout = async (): Promise<void> => {
    try {
      // Close SSE connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      localStorage.removeItem('token');
      setUser(null);
      setSelectedUser(null);
      setMessages([]);
      setUsers([]);
      setConnectionStatus('disconnected');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const sendMessage = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || !user) return;
    
    try {
      // 1. Coba ambil room_chat terlebih dahulu
      let response = await fetch(`/pages/api/room_chat/${user.id}`);
      const roomData = await response.json();

      let roomId;

      if (roomData.length === 0) {
        // 2. Jika belum ada room, buat room baru
        response = await fetch(`/pages/api/room_chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId: user.id })
        });

        const createdRoom = await response.json();

        if (!response.ok) {
          console.error('Failed to create room', createdRoom);
          return;
        }

        roomId = createdRoom.data.id;
      } else {
        // 3. Jika sudah ada room, ambil ID room pertama
        roomId = roomData[0].id;
      }

      // 4. Kirim pesan ke room yang didapat atau dibuat
      const payload = {
        room_id: roomId,
        message: newMessage,
        senderId: user.id
      };

      const responseMessage = await fetch(`/pages/api/messages/room_id/${roomId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (responseMessage.ok) {
        setNewMessage('');
      } else {
        const error = await responseMessage.text();
        console.error('Failed to send message', error);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setPassword(e.target.value);
  };

  const handleDisplayNameChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setDisplayName(e.target.value);
  };

  const handleMessageChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setNewMessage(e.target.value);
  };

  const handleUserSelect = (selectedUser: ChatUser): void => {
    setSelectedUser(selectedUser);
  };

  const toggleAuthMode = (): void => {
    setIsLogin(!isLogin);
    setError('');
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#4CAF50';
      case 'connecting': return '#FF9800';
      case 'disconnected': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="auth-container">
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>
          {isLogin ? 'Login' : 'Register'}
        </h2>
        <form onSubmit={handleAuth} className="auth-form">
          {!isLogin && (
            <input
              type="text"
              placeholder="Nama Lengkap"
              value={displayName}
              onChange={handleDisplayNameChange}
              className="input"
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={handleEmailChange}
            className="input"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={handlePasswordChange}
            className="input"
            required
          />
          <button type="submit" className="button">
            {isLogin ? 'Login' : 'Register'}
          </button>
        </form>
        
        {error && <p className="error">{error}</p>}
        
        <p style={{ textAlign: 'center', marginTop: '20px' }}>
          {isLogin ? "Belum punya akun? " : "Sudah punya akun? "}
          <span 
            style={{ color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }}
            onClick={toggleAuthMode}
          >
            {isLogin ? 'Register' : 'Login'}
          </span>
        </p>
        
        <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
          <h4>Akun untuk Testing:</h4>
          <p><strong>Admin:</strong> user1@test.com / password123</p>
          <p><strong>Customer:</strong> user2@test.com / password123</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="chat-container">
        <div className="sidebar">
          <div className="user-info">
            <h3>Welcome!</h3>
            <p>{user.name || user.email}</p>
            
            {/* Connection Status Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
              <div 
                style={{ 
                  width: '10px', 
                  height: '10px', 
                  borderRadius: '50%', 
                  backgroundColor: getConnectionStatusColor(),
                  marginRight: '8px'
                }}
              />
              <small style={{ color: '#666' }}>
                {connectionStatus === 'connected' ? 'Connected' : 
                connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
              </small>
            </div>
          </div>
          
          <div className="users-list">
            <h4 style={{ marginBottom: '15px' }}>Users List</h4>
            {users.map((u) => (
              <div
                key={u.id}
                className={`user-item ${selectedUser?.id === u.id ? 'active' : ''}`}
                onClick={() => handleUserSelect(u)}
              >
                {u.name || u.email}
              </div>
            ))}
          </div>
          
          <button onClick={handleLogout} className="button logout-btn">
            Logout
          </button>
        </div>

        <div className="chat-area">
          {selectedUser ? (
            <>
              <div className="chat-header">
                <h3>Chat dengan {selectedUser.name || selectedUser.email}</h3>
              </div>
              
              <div className="messages-container">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`message ${message.senderId === user.id ? 'sent' : 'received'}`}
                  >
                    {message.message}
                    <br />
                    <span className={`block text-xs text-end ${message.senderId === user.id ? 'text-white' : 'text-gray-500'}`}>
                      {new Date(message.send_at).toLocaleString("id-ID", {
                        timeZone: userTimeZone,
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              
              <form onSubmit={sendMessage} className="message-input-container">
                <input
                  type="text"
                  placeholder="Ketik pesan..."
                  value={newMessage}
                  onChange={handleMessageChange}
                  className="input message-input"
                  disabled={connectionStatus !== 'connected'}
                />
                <button 
                  type="submit" 
                  className="button send-btn"
                  disabled={connectionStatus !== 'connected'}
                >
                  Kirim
                </button>
              </form>
            </>
          ) : (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '100%',
              color: '#666'
            }}>
              Pilih user untuk mulai chat
            </div>
          )}
        </div>
      </div>
    </div>
  );
}