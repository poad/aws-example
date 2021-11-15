import { NextApiRequest, NextApiResponse } from 'next';
import { SigninToken } from '../../interfaces';

const handler = async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  if (req.query.session !== undefined) {
    const session = req.query.session as string;
    const signinToken = await fetch(
      // eslint-disable-next-line max-len
      `https://signin.aws.amazon.com/federation?Action=getSigninToken&SessionType=json&Session=${encodeURIComponent(
        session,
      )}`,
    ).then(async (resp) => (await resp.json()).SigninToken as string);
    res.status(200).json({
      signinToken,
    } as SigninToken);
  }
  res.status(400);
};

export default handler;
