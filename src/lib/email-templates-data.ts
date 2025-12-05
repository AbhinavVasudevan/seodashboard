// Predefined email templates for outreach

export interface PredefinedTemplate {
  name: string
  subject: string
  body: string
  category: 'outreach' | 'followup'
}

export const PREDEFINED_TEMPLATES: PredefinedTemplate[] = [
  // ============================================
  // OUTREACH TEMPLATES
  // ============================================
  {
    name: 'Outreach - Paid Guest Post (MonsterCasino)',
    subject: 'Interested in a Paid Guest Post Partnership with {domain}',
    category: 'outreach',
    body: `<p>Hi,</p>

<p>I hope you're doing well.</p>

<p>I'm reaching out to explore a potential SEO content partnership with {domain}. We'd like to contribute a sponsored article that includes a contextual backlink to <a href="https://www.monstercasino.co.uk">www.monstercasino.co.uk</a>.</p>

<p>We'd like to follow a similar style to this article you've published on your site:<br>
<a href="{url}">{url}</a></p>

<p>We're flexible with budget and happy to meet your editorial requirements.</p>

<p>Please let me know your rates and if this is something you're open to.</p>

<p>Best regards,<br>
Abhinav Vasudevan</p>`
  },
  {
    name: 'Outreach - Paid Publishing (SwiftCasino)',
    subject: 'Exploring Paid Publishing Options on {domain}',
    category: 'outreach',
    body: `<p>Hi,</p>

<p>Hope you're doing great!</p>

<p>I wanted to check if {domain} is currently accepting sponsored posts. We'd like to contribute an article featuring a backlink to <a href="https://www.swiftcasino.com">www.swiftcasino.com</a>.</p>

<p>We noticed this article on your site and would love to follow a similar structure and tone:<br>
<a href="{url}">{url}</a></p>

<p>Let me know your rates and guidelines, happy to work around them.</p>

<p>Best regards,<br>
Abhinav</p>`
  },
  {
    name: 'Outreach - Article Placement (MonsterCasino)',
    subject: 'Interested in a Paid Article Placement on {domain}',
    category: 'outreach',
    body: `<p>Hi,</p>

<p>I'm reaching out to propose a content collaboration with {domain}. We'd like to publish an article including a natural backlink to <a href="https://www.monstercasino.co.uk">MonsterCasino.co.uk</a>.</p>

<p>To match your editorial style, we'd like to mirror the approach used in this article on your site:<br>
<a href="{url}">{url}</a></p>

<p>We're flexible with the budget and open to discussing long-term partnerships as well.</p>

<p>Looking forward to your response.</p>

<p>Best regards,<br>
Abhinav Vasudevan</p>`
  },
  {
    name: 'Outreach - SEO Partnership Proposal',
    subject: 'SEO Content Partnership Proposal with {domain}',
    category: 'outreach',
    body: `<p>Hi there,</p>

<p>I hope you're doing well. I'm reaching out to propose a potential SEO content collaboration with {domain}. We'd love to contribute a sponsored article that includes a backlink to our platform, <a href="https://www.monstercasino.co.uk">MonsterCasino.co.uk</a>.</p>

<p>We're hoping to follow a structure similar to the article that's there on your site, which can be viewed here:<br>
<a href="{url}">{url}</a></p>

<p>We're flexible on budget and would be happy to discuss terms that work for both sides.</p>

<p>Looking forward to hearing from you!</p>

<p>Best regards,<br>
Abhinav Vasudevan</p>`
  },
  {
    name: 'Outreach - Partnership Inquiry (SwiftCasino)',
    subject: 'Partnership Inquiry: SEO Content Collaboration with {domain}',
    category: 'outreach',
    body: `<p>Hi there,</p>

<p>I hope you're doing well. I'm reaching out to explore a potential SEO content partnership with {domain}. We're interested in contributing a sponsored article that includes a backlink to our platform, <a href="https://www.swiftcasino.com">www.swiftcasino.com</a>.</p>

<p>We'd love for the piece to reflect a similar tone and structure to this article you previously published:<br>
<a href="{url}">{url}</a></p>

<p>We're flexible with budget and happy to discuss terms that would work well for both sides.</p>

<p>Please let me know if this is something you'd be open to discussing.</p>

<p>Best regards,<br>
Abhinav Vasudevan</p>`
  },
  {
    name: 'Outreach - Guest Post Collaboration',
    subject: 'Exploring an SEO Content Collaboration with {domain}',
    category: 'outreach',
    body: `<p>Hello,</p>

<p>I'm reaching out to explore the possibility of contributing a guest post to {domain}. As part of the article, we'd like to include a backlink to one of our platforms, <a href="https://www.monstercasino.co.uk">MonsterCasino.co.uk</a>.</p>

<p>We would like the format to be similar to the article published by you, which can be viewed here:<br>
<a href="{url}">{url}</a></p>

<p>We are flexible regarding the budget and open to discussing commercial terms that work for both parties.</p>

<p>Looking forward to hearing your thoughts.</p>

<p>Best regards,<br>
Abhinav Vasudevan</p>`
  },
  {
    name: 'Outreach - Content Partnership (SwiftCasino)',
    subject: 'Inquiry Regarding SEO Content Partnership on {domain}',
    category: 'outreach',
    body: `<p>Hello,</p>

<p>I hope this message finds you well.</p>

<p>I'm reaching out to explore the possibility of collaborating with {domain} on a content partnership. We are interested in featuring a piece that includes a backlink to our platform, <a href="https://www.swiftcasino.com">www.swiftcasino.com</a>.</p>

<p>We would like the format to be similar to the article published by you, which can be viewed here:<br>
<a href="{url}">{url}</a></p>

<p>We are flexible regarding the budget and open to discussing commercial terms that work for both parties.</p>

<p>Looking forward to your response.</p>

<p>Best regards,<br>
Abhinav Vasudevan</p>`
  },

  // ============================================
  // FOLLOW-UP TEMPLATES
  // ============================================
  {
    name: 'Follow-up - Professional & Polite',
    subject: 'Follow-Up on Content Partnership Proposal',
    category: 'followup',
    body: `<p>Hi,</p>

<p>Just checking in regarding my earlier email about a potential content partnership with {domain}.</p>

<p>I'm happy to discuss the budget and any other details at a time that works for you.</p>

<p>Best regards,<br>
Abhinav Vasudevan</p>`
  },
  {
    name: 'Follow-up - Friendly & Direct',
    subject: 'Quick Follow-Up on Partnership Idea',
    category: 'followup',
    body: `<p>Hi,</p>

<p>I wanted to follow up on my previous message about a possible content partnership with {domain}.</p>

<p>I'd be glad to go over the budget or any other specifics whenever it's convenient for you.</p>

<p>Best regards,<br>
Abhinav Vasudevan</p>`
  },
  {
    name: 'Follow-up - Concise & Clear',
    subject: 'Content Partnership - Just Following Up',
    category: 'followup',
    body: `<p>Hi,</p>

<p>Just a quick follow-up on my earlier note regarding a potential partnership with {domain}.</p>

<p>Let me know a good time to discuss the budget and next steps.</p>

<p>Thanks,<br>
Abhinav Vasudevan</p>`
  },
  {
    name: 'Follow-up - Busy Check-in',
    subject: 'Quick Touch Base on Partnership Proposal',
    category: 'followup',
    body: `<p>Hi,</p>

<p>I know things can get busy, so I wanted to quickly circle back on my earlier outreach regarding a potential collaboration with {domain}.</p>

<p>If this is still of interest, I'd be glad to set up a time to go over the budget and next steps.</p>

<p>Thanks,<br>
Abhinav Vasudevan</p>`
  },
  {
    name: 'Follow-up - Casual Touch Base',
    subject: 'Quick Touch Base on Partnership Proposal',
    category: 'followup',
    body: `<p>Hi,</p>

<p>Hope you're doing well! I wanted to follow up to see if you had a chance to review my previous note about exploring a partnership with {domain}.</p>

<p>I'd love to connect when you're available to discuss how we can move forward.</p>

<p>Thanks,<br>
Abhinav Vasudevan</p>`
  }
]
