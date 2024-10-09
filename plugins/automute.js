const {bot}=require('../lib')

bot(
  {
    pattern: 'automute ?(.*)',
    fromMe: false,
    desc: 'AutoMutes Group At a Specific time',
    type: 'group',
  },
  async(message,match,m,client) => {
    
  }
)
