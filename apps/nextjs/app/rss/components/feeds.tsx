'use client'

import { useInView } from 'react-intersection-observer'
import { find } from '../services'
import { Card } from './card'
import type { ChannelCard } from '../models'
import { rss } from '@shared/integrations/rss/client'
import { RssOptions } from '@shared/integrations/rss/options'
import { Container, Head, Spinner, Trigger } from '@shared/components'
import type { Feed } from '@core/rss/core'

export const Feeds = ({ defaults, channel }: { defaults: Feed; channel: ChannelCard }) => {
  const { pages, more, paging, next } = rss.infinite(() => find(channel.slug), {
    key: ['feed', channel.slug],
    size: RssOptions.Limit,
    defaults: defaults,
  })

  const { ref } = useInView({
    onChange: (viewed) => viewed && more && !paging && next(),
  })

  const articles = pages.flatMap((page) => page.entries)

  return (
    <Container>
      <Head>
        <Trigger kind="link" href="/rss">
          ← 戻る
        </Trigger>
      </Head>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map((article, index) => (
          <Card key={article.identifier || article.link || index} article={article} />
        ))}
      </div>
      {more && <div ref={ref}>{paging && <Spinner />}</div>}
    </Container>
  )
}
