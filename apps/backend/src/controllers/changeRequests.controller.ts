import { Request, Response, NextFunction } from 'express';
import { confirmChangeRequest } from '../services/changeRequest.service';
import { auditLog } from '../services/audit.service';

export const confirmRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id;
    const body = req.body as { confirm: boolean };
    if (!body.confirm) {
      return res.status(400).json({ error: 'Confirmation required' });
    }
    const result = await confirmChangeRequest(req, id);
    if (!result.ok) {
      await auditLog({
        action: 'change_request.confirm.failed',
        userId: req.session.user?.id,
        req,
        targetType: 'change_request',
        targetId: id,
        status: 'failed',
        requestId: id,
        error: result.message
      });
      return res.status(result.status).json({ error: result.message });
    }

    await auditLog({
      action: 'change_request.confirm.success',
      userId: req.session.user?.id,
      req,
      targetType: 'change_request',
      targetId: id,
      status: 'success',
      requestId: id
    });

    return res.json({ status: 'executed' });
  } catch (err) {
    next(err);
  }
};
