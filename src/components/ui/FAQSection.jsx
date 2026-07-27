// src/components/ui/FAQSection.jsx
// FAQ avec recherche + accordéon pour la landing page

import { useState, useEffect, useMemo } from 'react'
import { getPublishedFAQs } from '@/services/faqService'
import { ChevronDown, Search } from 'lucide-react'

export default function FAQSection() {
  const [faqs, setFaqs] = useState([])
  const [loading, setLoading] = useState(true)
  const [openIndex, setOpenIndex] = useState(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    async function fetchFAQs() {
      const { faqs: data } = await getPublishedFAQs()
      setFaqs(data)
      setLoading(false)
    }
    fetchFAQs()
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return faqs
    const q = query.toLowerCase()
    return faqs.filter((f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q))
  }, [faqs, query])

  if (loading) {
    return (
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <div className="h-8 w-56 bg-[#eef1ff] rounded mx-auto animate-pulse" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-[#f8f5ff] rounded-2xl p-6 h-16 animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white" id="faq">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-display font-bold text-[#0b1c30] mb-8">Questions Fréquentes</h2>

          <div className="relative max-w-md mx-auto">
            <Search className="w-4 h-4 text-[#a89fb5] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une question..."
              className="w-full pl-11 pr-4 py-3 rounded-full border border-[#ded6f3] bg-[#f8f5ff] text-sm
                         text-[#0b1c30] placeholder:text-[#a89fb5]
                         focus:outline-none focus:ring-2 focus:ring-[#8127cf]/20 focus:border-[#8127cf] transition-all"
            />
          </div>
        </div>

        <div className="space-y-3">
          {filtered.map((faq, index) => (
            <div
              key={faq.id}
              className="bg-[#f8f5ff] rounded-2xl overflow-hidden border border-[#8127cf]/10 hover:border-[#8127cf]/30 transition-colors"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left"
                aria-expanded={openIndex === index}
              >
                <span className="font-bold text-[#0b1c30] pr-4">{faq.question}</span>
                <ChevronDown
                  className={`w-5 h-5 text-[#8127cf] transition-transform flex-shrink-0 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openIndex === index && (
                <div className="px-6 pb-5 pt-0">
                  <p className="text-[#7e7385] leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[#7e7385]">Aucune question ne correspond à votre recherche.</p>
          </div>
        )}
      </div>
    </section>
  )
}
