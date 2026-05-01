import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PerformanceEventDocument = HydratedDocument<PerformanceEvent>;

@Schema({ versionKey: false, collection: 'performance_events' })
export class PerformanceEvent {
  @Prop({ required: true })
  target!: string;

  @Prop({ required: false })
  params?: string;

  @Prop({ required: true })
  duration!: number;

  @Prop({ required: true })
  createdAt!: Date;
}

export const PerformanceEventSchema =
  SchemaFactory.createForClass(PerformanceEvent);
