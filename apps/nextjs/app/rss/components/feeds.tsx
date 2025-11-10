'use client'

import { useInView } from 'react-intersection-observer'

import type { Feed } from '@core/rss'

import { Container, Head, Spinner, Trigger } from '@kit/components'

import { find } from '../services'
import { Card } from './card'
import { rss } from '../integrations/client'
import { RssOptions } from '../integrations/options'
import type { ChannelCard } from '../models'

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
