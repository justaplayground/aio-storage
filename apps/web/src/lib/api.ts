import axios, { AxiosInstance } from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: `${API_URL}/api/v1`,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor to handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          window.location.href = '/auth/login'
        }
        return Promise.reject(error)
      }
    )
  }

  public async register(data: { username: string; email: string; password: string }) {
    const response = await this.client.post('/auth/register', data)
    return response.data
  }

  public async login(data: { email: string; password: string }) {
    const response = await this.client.post('/auth/login', data)
    return response.data
  }

  public async getMe() {
    const response = await this.client.get('/auth/me')
    return response.data
  }

  public async healthCheck() {
    const response = await this.client.get('/health')
    return response.data
  }
}

export const apiClient = new ApiClient()

