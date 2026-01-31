/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)',
  			'4xl': '2rem',
  			'5xl': '2.5rem'
  		},
  		colors: {
  			'lokal': {
  				'navy': '#0f172a',
  				'deep': '#1e293b',
  				'slate': '#334155',
  				'blue': '#3b82f6',
  				'cyan': '#06b6d4',
  				'purple': '#8b5cf6',
  				'pink': '#ec4899',
  				'accent': '#22d3ee'
  			}
  		},
  		animation: {
  			'float': 'float 6s ease-in-out infinite',
  			'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  			'shimmer': 'shimmer 2s linear infinite',
  			'glow': 'glow 2s ease-in-out infinite alternate',
  			'slide-up': 'slideUp 0.5s ease-out',
  			'slide-down': 'slideDown 0.3s ease-out',
  			'scale-in': 'scaleIn 0.2s ease-out',
  			'fade-in': 'fadeIn 0.3s ease-out',
  			'bounce-soft': 'bounceSoft 0.6s ease-out',
  			'gradient': 'gradient 8s ease infinite',
  			'spin-slow': 'spin 8s linear infinite'
  		},
  		keyframes: {
  			float: {
  				'0%, 100%': { transform: 'translateY(0px)' },
  				'50%': { transform: 'translateY(-20px)' }
  			},
  			shimmer: {
  				'0%': { backgroundPosition: '-200% 0' },
  				'100%': { backgroundPosition: '200% 0' }
  			},
  			glow: {
  				'0%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)' },
  				'100%': { boxShadow: '0 0 40px rgba(59, 130, 246, 0.6)' }
  			},
  			slideUp: {
  				'0%': { transform: 'translateY(20px)', opacity: '0' },
  				'100%': { transform: 'translateY(0)', opacity: '1' }
  			},
  			slideDown: {
  				'0%': { transform: 'translateY(-10px)', opacity: '0' },
  				'100%': { transform: 'translateY(0)', opacity: '1' }
  			},
  			scaleIn: {
  				'0%': { transform: 'scale(0.95)', opacity: '0' },
  				'100%': { transform: 'scale(1)', opacity: '1' }
  			},
  			fadeIn: {
  				'0%': { opacity: '0' },
  				'100%': { opacity: '1' }
  			},
  			bounceSoft: {
  				'0%, 100%': { transform: 'translateY(0)' },
  				'50%': { transform: 'translateY(-5px)' }
  			},
  			gradient: {
  				'0%, 100%': { backgroundPosition: '0% 50%' },
  				'50%': { backgroundPosition: '100% 50%' }
  			}
  		},
  		backgroundImage: {
  			'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
  			'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
  			'mesh-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  		},
  		backdropBlur: {
  			'xs': '2px'
  		},
  		boxShadow: {
  			'glow': '0 0 20px rgba(59, 130, 246, 0.35)',
  			'glow-lg': '0 0 40px rgba(59, 130, 246, 0.4)',
  			'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.35)',
  			'glow-purple': '0 0 20px rgba(139, 92, 246, 0.35)',
  			'inner-glow': 'inset 0 0 20px rgba(255, 255, 255, 0.1)',
  			'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(255, 255, 255, 0.05)',
  			'card-hover': '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)'
  		}
  	}
  },
  plugins: [import("tailwindcss-animate")],
}

