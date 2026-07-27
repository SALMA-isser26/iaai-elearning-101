// src/components/ui/TestimonialsCarousel.jsx
// Grille de témoignages pour la landing page (3 cartes, conforme à la maquette)

import { useState, useEffect } from 'react'
import { getFeaturedTestimonials } from '@/services/testimonialService'
import { Star } from 'lucide-react'

export default function TestimonialsCarousel() {
  const [testimonials, setTestimonials] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTestimonials() {
      const { testimonials: data } = await getFeaturedTestimonials(3)
      setTestimonials(data)
      setLoading(false)
    }
    fetchTestimonials()
  }, [])

  if (loading) {
    return (
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#f8f5ff]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="h-8 w-64 bg-[#eef1ff] rounded mx-auto animate-pulse mb-3" />
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm animate-pulse h-48" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (testimonials.length === 0) return null

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#f8f5ff]" id="temoignages">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-display font-bold text-[#0b1c30]">Ils apprennent avec nous</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <article
              key={t.id}
              className="bg-white rounded-2xl border border-[#8127cf]/10 shadow-sm p-7 flex flex-col hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${star <= t.rating ? 'fill-amber-400 text-amber-400' : 'text-[#ded6f3]'}`}
                  />
                ))}
              </div>

              <p className="text-[#4d4354] leading-relaxed mb-6 flex-grow">"{t.content}"</p>

              <div className="flex items-center gap-3 pt-4 border-t border-[#f0f0f5]">
                {t.avatar_url ? (
                  <img src={t.avatar_url} alt={t.full_name} className="w-11 h-11 rounded-full object-cover" />
                ) : (
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)' }}
                  >
                    {t.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-[#0b1c30] text-sm">{t.full_name}</h4>
                  <p className="text-xs text-[#7e7385]">{t.role}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
