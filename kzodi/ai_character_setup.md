# KZodi App တွင် User နှင့် AI Character ချိတ်ဆက်မှုနှင့် Response လုပ်ဆောင်ပုံ

User နှင့် AI Character များအကြား connection ကို client-side state management (`zustand`)၊ server-side API (`/api/roleplay`) နှင့် Database (`PostgreSQL`) တို့ကို ပေါင်းစပ်ပြီး အဆင့်ဆင့် တည်ဆောက်ထားပါတယ်။

## 1. AI Character များ ဖန်တီးခြင်းနှင့် သိမ်းဆည်းခြင်း (Database Setup)
Character တွေကို `src/lib/db.ts` မှာရှိတဲ့ `characters` table ထဲမှာ သိမ်းဆည်းပါတယ်။ 
Character တစ်ခုချင်းစီမှာ အောက်ပါ အချက်အလက်တွေ ပါဝင်ပါတယ်-
- **Name, Tag, Image** (အခြေခံ အချက်အလက်များ)
- **Description & Long Description** (Character ရဲ့ နောက်ခံ ဇာတ်လမ်း)
- **Personality** (စရိုက်လက္ခဏာ)
- **Scenario & Example Dialogue** (အခြေအနေနှင့် စကားပြောဟန် နမူနာ)
- **Greeting** (စတင် နှုတ်ခွန်းဆက်မည့် စကား)

ဒီအချက်အလက်တွေကို `src/app/api/characters` API ကနေတစ်ဆင့် Database ထဲကို သိမ်းဆည်းပြီး AI က conversation လုပ်တဲ့အခါ System Prompt တွေအဖြစ် ပြောင်းလဲ အသုံးပြုပါတယ်။

## 2. User နှင့် AI Connection (Chat UI)
`src/components/chat-app/ChatRoom.tsx` မှာ User နဲ့ AI ကြားက အဓိက Chat interface ကို တည်ဆောက်ထားပါတယ်။
- **State Management**: `useChatStore` (`src/lib/chatStore.ts`) ကိုသုံးပြီး user ပို့လိုက်တဲ့ message တွေ၊ AI ပြန်ပို့တဲ့ message တွေကို local state မှာ သိမ်းထားပါတယ်။ 
- User က message ပို့လိုက်တဲ့အခါ `triggerAiResponse` ဆိုတဲ့ function ကို အလုပ်လုပ်စေပါတယ်။

## 3. AI Response ပြန်လည်ပေးပို့ခြင်း (Step-by-step Mechanism)
AI က လူသားတစ်ယောက်လို တုံ့ပြန်မှု ပေးနိုင်အောင် အောက်ပါ အဆင့်တွေအတိုင်း လုပ်ဆောင်ထားပါတယ်-

1. **Reading Delay (ဖတ်နေသည့် အချိန် Simulating)**: User message ကို ချက်ချင်း မပြန်ဘဲ `1.5s` ကနေ `3s` အထိ delay ပေးထားပါတယ်။
2. **Typing Indicator (စာရိုက်နေကြောင်း ပြသခြင်း)**: `setIsTyping(true)` ကို သုံးပြီး AI စာရိုက်နေကြောင်း (typing indicator) ကို ပြပါတယ်။ Group chat ဆိုရင် ဘယ်သူရိုက်နေလဲဆိုတာ (`typingMemberName`) ပါ ပြပေးပါတယ်။
3. **Context နှင့် History စုစည်းခြင်း**: 
   - User ရဲ့ နောက်ဆုံး message နဲ့ တကွ အရင်ပြောခဲ့တဲ့ စကားပြောမှတ်တမ်း (history ကို နောက်ဆုံး ၁၅ ကြောင်း အထိ) ကို ယူပါတယ်။ 
   - အကယ်၍ reply ပြန်တဲ့ message ဖြစ်နေရင် `[MessageID: ...] (Replying to your message: "...")` ဆိုပြီး AI ကို သေချာ ထပ်မံ သိအောင် ထည့်ပေးပါတယ်။
4. **API Request ပို့ခြင်း**: 
   - စုစည်းလိုက်တဲ့ message history, character ရဲ့ personality, tag စတာတွေကို `src/app/api/roleplay` ကို POST request အနေနဲ့ ပို့ပေးပါတယ်။
5. **AI Response လက်ခံခြင်း**: 
   - `/api/roleplay` ကနေ (LLM AI Model ဆီကနေတစ်ဆင့်) ပြန်ရလာတဲ့ စာသားကို `useChatStore` ရဲ့ `sendMessage` ကနေတစ်ဆင့် Chat UI ပေါ်မှာ ချက်ချင်း update လုပ်ပြီး ပြသပေးပါတယ်။

## 4. Group Chat လုပ်ဆောင်ပုံ (Special Feature)
တကယ်လို့ User က Group Chat ထဲရောက်နေရင် (`character.id` က `group-` နဲ့ စနေရင်) -
- Group ထဲမှာရှိတဲ့ Member (AI Characters) တွေအားလုံးကို ဆွဲထုတ် (Load) လုပ်ပါတယ်။
- AI member တစ်ယောက်ချင်းစီဟာ Random အစီအစဉ်နဲ့ စာပြန်ကြပါတယ်။
- မတူညီတဲ့ Delay တွေ ထည့်ထားပြီး လူသားဆန်စေဖို့ Member များရင် အချို့ member တွေကို message လွတ်သွားတာမျိုး (ဥပမာ 30% မပြန်ဘဲ နေတာမျိုး) တွေပါ ထည့်သွင်း ရေးကုဒ်လုပ်ထားပါတယ်။

---
*အချုပ်အားဖြင့်ဆိုရလျှင် User နဲ့ AI ရဲ့ ချိတ်ဆက်မှုကို ချက်ချင်းလိုင်းပေါ်တင်ပေးတဲ့ Web API ခေါ်ဆိုမှုတွေနဲ့လုပ်ထားပြီး၊ လူသားနဲ့ တကယ်စကားပြောနေရသကဲ့သို့ ခံစားရအောင် Time delays တွေ၊ History tracking တွေ၊ Typing indicators တွေကို အသေအချာ step-by-step တည်ဆောက်ထားခြင်း ဖြစ်ပါတယ်။*
