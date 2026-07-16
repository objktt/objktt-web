import React from 'react';
import LegalPage from '../components/LegalPage';
import { REWARDS } from '../data/rewards';
import { useLanguage } from '../contexts/LanguageContext';

const wonKo = (n: number) => `${n.toLocaleString('ko-KR')}원`;
const wonEn = (n: number) => `₩${n.toLocaleString('en-US')}`;
const pct = `${Math.round(REWARDS.earnRate * 100)}%`;
const years = REWARDS.expiryMonths / 12;

const Points: React.FC = () => {
  const { language } = useLanguage();

  if (language === 'en') {
    return (
      <LegalPage
        title="Rewards Policy"
        updated="Effective 2026-06-07"
        seoTitle="Rewards Policy | OBJKTT"
        seoDescription="OBJKTT (Objktt) reward points: how points are earned, used, and expire."
        intro={'OBJKTT members earn reward points through purchases and activity, and can use them like cash on future orders. Reward points are a members-only (logged-in) benefit.'}
        infoRows={[
          ['Earn rate', `${pct} of the purchase amount (credited on shipment)`],
          ['Point value', `1 point = ${wonEn(REWARDS.pointValueKrw)}`],
          ['Conditions of use', `Members with at least one purchase, usable from ${wonEn(REWARDS.minUseKrw)} (no per-use limit)`],
          ['Expiry', `${years} year${years > 1 ? 's' : ''} from the date earned`],
        ]}
        sections={[
          {
            heading: 'How points are earned',
            body: `${pct} of the payment amount is earned on each purchase.\nPoints are credited when the order ships. (No points are earned if the order is cancelled before shipment.)\n1 point can be used as ${wonEn(REWARDS.pointValueKrw)}.`,
          },
          {
            heading: 'Sign-up bonus',
            body: `Sign up and receive ${REWARDS.signupBonus.toLocaleString('en-US')} points (${wonEn(REWARDS.signupBonus)}).`,
          },
          {
            heading: 'Using points',
            body: `Points become usable once you have made at least one purchase (order shipped).\nThey can be used from a balance of ${wonEn(REWARDS.minUseKrw)} or more, with no per-use limit.\nEnter the amount of points to use at checkout and it is deducted from the payment total.\nPoints can only be used while signed in.`,
          },
          {
            heading: 'Expiry',
            body: `Points expire automatically ${years} year${years > 1 ? 's' : ''} after they are earned.\nAll remaining points are forfeited and cannot be restored if you close your account.`,
          },
          {
            heading: 'Refunds & cancellations',
            body: 'If an order paid with points is refunded or cancelled, the used points are restored.\nPoints earned from that purchase are reclaimed upon refund or cancellation.',
          },
          {
            heading: 'Please note',
            body: 'Points cannot be redeemed for cash.\nIf points are found to have been earned through improper means, they may be reclaimed or their use restricted, and the rewards policy may change with prior notice.',
          },
        ]}
      />
    );
  }

  return (
    <LegalPage
      title="적립금 정책"
      updated="시행일 2026-06-07"
      seoTitle="적립금 정책 | OBJKTT"
      seoDescription="OBJKTT(오브옉트) 적립금 적립·사용·소멸 정책 안내"
      intro={'OBJKTT 회원은 구매 및 활동에 따라 적립금을 적립하고, 다음 구매 시 현금처럼 사용할 수 있습니다. 적립금은 회원(로그인) 전용 혜택입니다.'}
      infoRows={[
        ['적립률', `구매 금액의 ${pct} (상품 출고 시 적립)`],
        ['적립금 단위', `1 포인트 = ${wonKo(REWARDS.pointValueKrw)}`],
        ['사용 조건', `한 번 이상 구매한 회원, ${wonKo(REWARDS.minUseKrw)} 이상부터 사용 (1회 사용 한도 없음)`],
        ['소멸 기간', `적립일로부터 ${years}년`],
      ]}
      sections={[
        {
          heading: '적립 기준',
          body: `상품 구매 시 결제 금액의 ${pct}가 적립됩니다.\n적립은 주문 상품이 출고된 시점에 이루어집니다. (출고 전 취소 시 적립되지 않습니다.)\n1 포인트는 ${wonKo(REWARDS.pointValueKrw)}으로 사용할 수 있습니다.`,
        },
        {
          heading: '추가 적립',
          body: `회원가입 시 ${REWARDS.signupBonus.toLocaleString('ko-KR')} 포인트(${wonKo(REWARDS.signupBonus)})를 적립해 드립니다.`,
        },
        {
          heading: '사용 안내',
          body: `적립금은 한 번 이상 구매(상품 출고 완료)하신 회원부터 사용할 수 있습니다.\n${wonKo(REWARDS.minUseKrw)} 이상 보유 시부터 사용할 수 있으며, 1회 사용 한도는 없습니다.\n결제 단계에서 사용할 적립금을 입력하면 결제 금액에서 차감됩니다.\n적립금 사용은 회원(로그인) 상태에서만 가능합니다.`,
        },
        {
          heading: '소멸',
          body: `적립금은 적립일로부터 ${years}년이 지나면 자동으로 소멸됩니다.\n회원 탈퇴 시 보유한 적립금은 모두 소멸되며 복구되지 않습니다.`,
        },
        {
          heading: '환불·취소 시 처리',
          body: '적립금을 사용한 주문이 환불·취소되면 사용한 적립금은 다시 복원됩니다.\n해당 구매로 적립된 적립금은 환불·취소 시 회수됩니다.',
        },
        {
          heading: '유의사항',
          body: '적립금은 현금으로 환급되지 않습니다.\n부정한 방법으로 적립한 것으로 확인될 경우 적립금이 회수되거나 사용이 제한될 수 있으며, 적립 정책은 사전 고지 후 변경될 수 있습니다.',
        },
      ]}
    />
  );
};

export default Points;
